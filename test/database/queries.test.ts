// 统一构造 fake SQLiteDatabase：记录调用参数，按测试预设返回行。
// 不验证 SQL 执行语义（依赖真机/集成），仅验证 SQL 字符串构建、参数绑定与 mapRow 列映射。
jest.mock('../../src/database/schema', () => {
  const fakeDb = {
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 0, changes: 0 })),
    execAsync: jest.fn(() => Promise.resolve()),
    withTransactionAsync: jest.fn((cb: any) => cb()),
  };
  return { getDatabase: jest.fn(() => Promise.resolve(fakeDb)) };
});

import {
  getAllTasks,
  getTasksByPlanTypeAndRanges,
  getTaskById,
  createTask,
  updateTask,
  setTaskAndChildrenCompleted,
  deleteTask,
  updateTaskOrders,
  moveTaskToDate,
} from '../../src/database/queries';
import { getDatabase } from '../../src/database/schema';

const getDb = async () => {
  const db = await getDatabase();
  return db as unknown as {
    getAllAsync: jest.Mock;
    getFirstAsync: jest.Mock;
    runAsync: jest.Mock;
    execAsync: jest.Mock;
    withTransactionAsync: jest.Mock;
  };
};

// 构造 DB 行（snake_case）
const row = (overrides: Record<string, any> = {}) => ({
  id: 'r1',
  title: '任务',
  description: null,
  plan_type: 'daily',
  start_date: 1000,
  end_date: null,
  reminder_at: null,
  is_completed: 0,
  sort_order: 2,
  parent_task_id: null,
  created_at: 900,
  updated_at: 950,
  ...overrides,
});

beforeEach(async () => {
  jest.clearAllMocks();
  const db = await getDb();
  db.getAllAsync.mockResolvedValue([]);
  db.getFirstAsync.mockResolvedValue(null);
  db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 0 });
});

describe('queries mapRow 列映射', () => {
  it('snake_case 行映射为 camelCase Task，null -> undefined，is_completed 数字 -> 布尔', async () => {
    const db = await getDb();
    db.getAllAsync.mockResolvedValue([
      row({ is_completed: 1, plan_type: 'weekly', sort_order: 5, end_date: 2000, reminder_at: 1500, parent_task_id: 'p1', description: 'desc' }),
    ]);
    const [task] = await getAllTasks();
    expect(task).toEqual({
      id: 'r1',
      title: '任务',
      description: 'desc',
      planType: 'weekly',
      startDate: 1000,
      endDate: 2000,
      reminderAt: 1500,
      isCompleted: true,
      order: 5,
      parentTaskId: 'p1',
      createdAt: 900,
      updatedAt: 950,
    });
  });
});

describe('getAllTasks', () => {
  it('按 sort_order 升序查询全部', async () => {
    const db = await getDb();
    db.getAllAsync.mockResolvedValue([row({ id: 'a' }), row({ id: 'b' })]);
    const tasks = await getAllTasks();
    expect(tasks).toHaveLength(2);
    expect(db.getAllAsync.mock.calls[0][0]).toBe('SELECT * FROM tasks ORDER BY sort_order ASC');
  });
});

describe('getTasksByPlanTypeAndRanges', () => {
  it('空 range 直接返回 [] 不查库', async () => {
    const db = await getDb();
    const tasks = await getTasksByPlanTypeAndRanges('daily', []);
    expect(tasks).toEqual([]);
    expect(db.getAllAsync).not.toHaveBeenCalled();
  });

  it('单 range：SQL 含 plan_type 与一段 BETWEEN，参数顺序正确', async () => {
    const db = await getDb();
    db.getAllAsync.mockResolvedValue([row({ id: 'a' })]);
    await getTasksByPlanTypeAndRanges('daily', [{ start: 10, end: 20 }]);
    const [sql, params] = db.getAllAsync.mock.calls[0];
    expect(sql).toBe('SELECT * FROM tasks WHERE plan_type = ? AND (start_date BETWEEN ? AND ?) ORDER BY sort_order ASC');
    expect(params).toEqual(['daily', 10, 20]);
  });

  it('多 range：BETWEEN 以 OR 连接，参数按 range 顺序铺开', async () => {
    const db = await getDb();
    db.getAllAsync.mockResolvedValue([]);
    await getTasksByPlanTypeAndRanges('weekly', [
      { start: 10, end: 20 },
      { start: 30, end: 40 },
    ]);
    const [sql, params] = db.getAllAsync.mock.calls[0];
    expect(sql).toBe(
      'SELECT * FROM tasks WHERE plan_type = ? AND (start_date BETWEEN ? AND ? OR start_date BETWEEN ? AND ?) ORDER BY sort_order ASC'
    );
    expect(params).toEqual(['weekly', 10, 20, 30, 40]);
  });
});

describe('getTaskById', () => {
  it('存在时返回映射后的任务', async () => {
    const db = await getDb();
    db.getFirstAsync.mockResolvedValue(row({ id: 'x' }));
    const task = await getTaskById('x');
    expect(task?.id).toBe('x');
    expect(db.getFirstAsync.mock.calls[0]).toEqual(['SELECT * FROM tasks WHERE id = ?', ['x']]);
  });

  it('不存在时返回 undefined', async () => {
    const task = await getTaskById('missing');
    expect(task).toBeUndefined();
  });
});

describe('createTask', () => {
  it('无父任务：取最大 sort_order+1，插入 12 列，返回映射任务', async () => {
    const db = await getDb();
    // 1st getFirstAsync: MAX(sort_order)=5  2nd: 取回新建行
    db.getFirstAsync
      .mockResolvedValueOnce({ max_order: 5 })
      .mockResolvedValueOnce(row({ id: 'new', is_completed: 0, sort_order: 6 }));

    const task = await createTask({
      title: '新任务',
      planType: 'daily',
      startDate: 1000,
      description: 'desc',
    });

    expect(task.order).toBe(6);
    // 事务内 INSERT
    const insertCall = db.runAsync.mock.calls[0];
    expect(insertCall[0]).toContain('INSERT INTO tasks');
    const params = insertCall[1];
    expect(params[1]).toBe('新任务');
    expect(params[3]).toBe('daily'); // plan_type
    expect(params[6]).toBe(0); // is_completed
    expect(params[7]).toBe(6); // sort_order
    expect(params[8]).toBeNull(); // parent_task_id
    // MAX 查询参数为 planType
    const maxCall = db.getFirstAsync.mock.calls[0];
    expect(maxCall[0]).toContain('MAX(sort_order)');
    expect(maxCall[1]).toEqual(['daily']);
  });

  it('无现有任务时 sort_order 从 0 开始', async () => {
    const db = await getDb();
    db.getFirstAsync
      .mockResolvedValueOnce({ max_order: null }) // MAX 返回 null
      .mockResolvedValueOnce(row({ sort_order: 0 }));
    await createTask({ title: 't', planType: 'daily', startDate: 1 });
    expect(db.runAsync.mock.calls[0][1][7]).toBe(0);
  });

  it('有父任务：继承父 planType/startDate/endDate 并校验两层', async () => {
    const db = await getDb();
    // 1st: 取父任务  2nd: MAX  3rd: 取回新建行
    db.getFirstAsync
      .mockResolvedValueOnce(row({ id: 'parent', plan_type: 'monthly', start_date: 5000, end_date: 6000, parent_task_id: null }))
      .mockResolvedValueOnce({ max_order: 2 })
      .mockResolvedValueOnce(row({ id: 'child', plan_type: 'monthly', start_date: 5000, sort_order: 3, parent_task_id: 'parent' }));

    const task = await createTask({
      title: '子任务',
      planType: 'daily', // 应被父覆盖为 monthly
      startDate: 1,
      parentTaskId: 'parent',
    });

    expect(task.planType).toBe('monthly');
    expect(task.startDate).toBe(5000);
    expect(task.parentTaskId).toBe('parent');
    // 插入参数中 plan_type/start_date 用继承值
    const params = db.runAsync.mock.calls[0][1];
    expect(params[3]).toBe('monthly');
    expect(params[4]).toBe(5000);
  });

  it('父任务不存在时抛错', async () => {
    const db = await getDb();
    db.getFirstAsync.mockResolvedValueOnce(null); // 父任务查不到
    await expect(
      createTask({ title: 't', planType: 'daily', startDate: 1, parentTaskId: 'ghost' })
    ).rejects.toThrow('父任务不存在');
  });

  it('父任务自身已是子任务时抛错（仅支持两层）', async () => {
    const db = await getDb();
    db.getFirstAsync.mockResolvedValueOnce(row({ id: 'mid', parent_task_id: 'grand' }));
    await expect(
      createTask({ title: 't', planType: 'daily', startDate: 1, parentTaskId: 'mid' })
    ).rejects.toThrow('子任务不能再有子任务');
  });
});

describe('updateTask', () => {
  it('动态 SQL：仅拼接传入字段 + updated_at', async () => {
    const db = await getDb();
    await updateTask('id1', { title: '新标题', isCompleted: true });
    const [sql, params] = db.runAsync.mock.calls[0];
    expect(sql).toBe('UPDATE tasks SET title = ?, is_completed = ?, updated_at = ? WHERE id = ?');
    expect(params[0]).toBe('新标题');
    expect(params[1]).toBe(1); // isCompleted true -> 1
    expect(typeof params[2]).toBe('number'); // updated_at
    expect(params[3]).toBe('id1'); // WHERE id
  });

  it('isCompleted false -> 0', async () => {
    const db = await getDb();
    await updateTask('id1', { isCompleted: false });
    expect(db.runAsync.mock.calls[0][1][0]).toBe(0);
  });

  it('endDate null 透传以清除', async () => {
    const db = await getDb();
    await updateTask('id1', { endDate: null });
    const [sql, params] = db.runAsync.mock.calls[0];
    expect(sql).toContain('end_date = ?');
    expect(params[0]).toBeNull();
  });

  it('reminderAt 透传', async () => {
    const db = await getDb();
    await updateTask('id1', { reminderAt: 9000 });
    expect(db.runAsync.mock.calls[0][1][0]).toBe(9000);
  });

  it('planType/startDate/endDate 变更级联更新子任务', async () => {
    const db = await getDb();
    await updateTask('p1', { planType: 'weekly', startDate: 200, endDate: 300 });
    // 两次 runAsync：父任务 + 子任务
    expect(db.runAsync).toHaveBeenCalledTimes(2);
    const childCall = db.runAsync.mock.calls[1];
    expect(childCall[0]).toContain('WHERE parent_task_id = ?');
    expect(childCall[1]).toContain('weekly');
    expect(childCall[1]).toContain(200);
    expect(childCall[1]).toContain(300);
  });

  it('仅更新非级联字段时不触发子任务更新', async () => {
    const db = await getDb();
    await updateTask('p1', { title: 'x' });
    expect(db.runAsync).toHaveBeenCalledTimes(1);
  });
});

describe('setTaskAndChildrenCompleted', () => {
  it('更新自身与子任务的 is_completed', async () => {
    const db = await getDb();
    await setTaskAndChildrenCompleted('p1', true);
    expect(db.runAsync).toHaveBeenCalledTimes(2);
    expect(db.runAsync.mock.calls[0][0]).toContain('WHERE id = ?');
    expect(db.runAsync.mock.calls[1][0]).toContain('WHERE parent_task_id = ?');
    expect(db.runAsync.mock.calls[0][1][0]).toBe(1); // true
    expect(db.runAsync.mock.calls[1][1][0]).toBe(1);
  });
});

describe('deleteTask', () => {
  it('先删子任务再删自身', async () => {
    const db = await getDb();
    await deleteTask('p1');
    expect(db.runAsync.mock.calls[0]).toEqual(['DELETE FROM tasks WHERE parent_task_id = ?', ['p1']]);
    expect(db.runAsync.mock.calls[1]).toEqual(['DELETE FROM tasks WHERE id = ?', ['p1']]);
  });
});

describe('updateTaskOrders', () => {
  it('按 taskIds 顺序写入 sort_order=index', async () => {
    const db = await getDb();
    await updateTaskOrders('daily', ['a', 'b', 'c']);
    expect(db.runAsync).toHaveBeenCalledTimes(3);
    expect(db.runAsync.mock.calls[0]).toEqual(['UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?', [0, expect.any(Number), 'a']]);
    expect(db.runAsync.mock.calls[1][1]).toEqual([1, expect.any(Number), 'b']);
    expect(db.runAsync.mock.calls[2][1]).toEqual([2, expect.any(Number), 'c']);
  });
});

describe('moveTaskToDate', () => {
  it('更新自身与子任务的 start/end_date，未传 newEndDate 用 null', async () => {
    const db = await getDb();
    await moveTaskToDate('p1', 5000);
    expect(db.runAsync).toHaveBeenCalledTimes(2);
    expect(db.runAsync.mock.calls[0][0]).toContain('WHERE id = ?');
    expect(db.runAsync.mock.calls[1][0]).toContain('WHERE parent_task_id = ?');
    // 第二个参数为 newStart, newEnd(null), now, id
    expect(db.runAsync.mock.calls[0][1]).toEqual([5000, null, expect.any(Number), 'p1']);
  });

  it('传入 newEndDate 时透传', async () => {
    const db = await getDb();
    await moveTaskToDate('p1', 5000, 6000);
    expect(db.runAsync.mock.calls[0][1]).toEqual([5000, 6000, expect.any(Number), 'p1']);
  });
});
