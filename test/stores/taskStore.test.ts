jest.mock('../../src/database/queries', () => ({
  getTasksByPlanTypeAndRanges: jest.fn(() => Promise.resolve([])),
  createTask: jest.fn(),
  updateTask: jest.fn(() => Promise.resolve()),
  deleteTask: jest.fn(() => Promise.resolve()),
  setTaskAndChildrenCompleted: jest.fn(() => Promise.resolve()),
  updateTaskOrders: jest.fn(() => Promise.resolve()),
  moveTaskToDate: jest.fn(() => Promise.resolve()),
  getAllTasks: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../src/services/notificationService', () => ({
  scheduleTaskReminder: jest.fn(() => Promise.resolve()),
  cancelTaskReminder: jest.fn(() => Promise.resolve()),
}));

import { useTaskStore } from '../../src/stores/taskStore';
import * as queries from '../../src/database/queries';
import { scheduleTaskReminder, cancelTaskReminder } from '../../src/services/notificationService';
import type { Task } from '../../src/types';

const makeTask = (o: Partial<Task> = {}): Task => ({
  id: 't1',
  title: '任务',
  planType: 'daily',
  startDate: 1500,
  isCompleted: false,
  order: 0,
  createdAt: 100,
  updatedAt: 100,
  ...o,
});

const RANGE = [{ start: 1000, end: 2000 }];

// 将 store 置于已知视图状态：daily + [1000,2000]
const setView = (tasks: Task[] = []) =>
  useTaskStore.setState({
    tasks,
    currentPlanType: 'daily',
    currentRanges: RANGE,
    isLoading: false,
    error: null,
  });

beforeEach(() => {
  jest.clearAllMocks();
  (queries.getTasksByPlanTypeAndRanges as jest.Mock).mockResolvedValue([]);
  setView([]);
});

describe('loadTasks', () => {
  it('传参：加载并设置视图参数', async () => {
    (queries.getTasksByPlanTypeAndRanges as jest.Mock).mockResolvedValue([makeTask({ id: 'a' })]);
    await useTaskStore.getState().loadTasks('daily', RANGE);
    expect(queries.getTasksByPlanTypeAndRanges).toHaveBeenCalledWith('daily', RANGE);
    expect(useTaskStore.getState().tasks).toHaveLength(1);
    expect(useTaskStore.getState().currentPlanType).toBe('daily');
    expect(useTaskStore.getState().currentRanges).toBe(RANGE);
  });

  it('无参且无上次视图：置空返回不查库', async () => {
    useTaskStore.setState({ currentPlanType: null, currentRanges: null, tasks: [makeTask()] });
    await useTaskStore.getState().loadTasks();
    expect(useTaskStore.getState().tasks).toEqual([]);
    expect(queries.getTasksByPlanTypeAndRanges).not.toHaveBeenCalled();
  });

  it('无参但有上次视图：用上次参数重新加载', async () => {
    (queries.getTasksByPlanTypeAndRanges as jest.Mock).mockResolvedValue([makeTask({ id: 'b' })]);
    await useTaskStore.getState().loadTasks('daily', RANGE);
    (queries.getTasksByPlanTypeAndRanges as jest.Mock).mockClear();
    (queries.getTasksByPlanTypeAndRanges as jest.Mock).mockResolvedValue([makeTask({ id: 'c' })]);
    await useTaskStore.getState().loadTasks();
    expect(queries.getTasksByPlanTypeAndRanges).toHaveBeenCalledWith('daily', RANGE);
    expect(useTaskStore.getState().tasks[0].id).toBe('c');
  });

  it('空 range：返回空列表', async () => {
    await useTaskStore.getState().loadTasks('daily', []);
    expect(useTaskStore.getState().tasks).toEqual([]);
  });
});

describe('addTask', () => {
  it('属当前视图时加入内存', async () => {
    (queries.createTask as jest.Mock).mockResolvedValue(makeTask({ id: 'new', startDate: 1500 }));
    await useTaskStore.getState().addTask({ title: '新', planType: 'daily', startDate: 1500 });
    expect(useTaskStore.getState().tasks).toHaveLength(1);
    expect(useTaskStore.getState().tasks[0].id).toBe('new');
  });

  it('不属当前视图时不加入', async () => {
    (queries.createTask as jest.Mock).mockResolvedValue(makeTask({ id: 'new', planType: 'weekly' }));
    await useTaskStore.getState().addTask({ title: '新', planType: 'weekly', startDate: 1500 });
    expect(useTaskStore.getState().tasks).toHaveLength(0);
  });

  it('带提醒时调度通知', async () => {
    (queries.createTask as jest.Mock).mockResolvedValue(
      makeTask({ id: 'r', reminderAt: 9999 })
    );
    await useTaskStore.getState().addTask({ title: '提醒', planType: 'daily', startDate: 1500, reminderAt: 9999 });
    expect(scheduleTaskReminder).toHaveBeenCalledWith('r', '任务', 9999);
  });
});

describe('updateTask', () => {
  it('更新字段回流内存', async () => {
    setView([makeTask({ id: 't1', title: '旧' })]);
    await useTaskStore.getState().updateTask('t1', { title: '新标题' });
    expect(useTaskStore.getState().tasks[0].title).toBe('新标题');
  });

  it('改 startDate 离开当前视图则从内存移除', async () => {
    setView([makeTask({ id: 't1', startDate: 1500 })]);
    await useTaskStore.getState().updateTask('t1', { startDate: 9999 });
    expect(useTaskStore.getState().tasks).toHaveLength(0);
  });

  it('父任务 startDate 变更级联到子任务', async () => {
    setView([
      makeTask({ id: 'p', startDate: 1500 }),
      makeTask({ id: 'c', parentTaskId: 'p', startDate: 1500 }),
    ]);
    await useTaskStore.getState().updateTask('p', { startDate: 1800 });
    const parent = useTaskStore.getState().tasks.find((t) => t.id === 'p');
    const child = useTaskStore.getState().tasks.find((t) => t.id === 'c');
    expect(parent?.startDate).toBe(1800);
    expect(child?.startDate).toBe(1800);
  });

  it('reminderAt 变更为非空：重新调度', async () => {
    setView([makeTask({ id: 't1', title: '任务' })]);
    await useTaskStore.getState().updateTask('t1', { reminderAt: 5000 });
    expect(scheduleTaskReminder).toHaveBeenCalledWith('t1', '任务', 5000);
    expect(cancelTaskReminder).not.toHaveBeenCalled();
  });

  it('reminderAt 置 null：仅取消', async () => {
    setView([makeTask({ id: 't1' })]);
    await useTaskStore.getState().updateTask('t1', { reminderAt: null });
    expect(cancelTaskReminder).toHaveBeenCalledWith('t1');
    expect(scheduleTaskReminder).not.toHaveBeenCalled();
  });
});

describe('deleteTask', () => {
  it('移除自身与子任务，并取消提醒', async () => {
    setView([
      makeTask({ id: 'p' }),
      makeTask({ id: 'c', parentTaskId: 'p' }),
      makeTask({ id: 'other' }),
    ]);
    await useTaskStore.getState().deleteTask('p');
    expect(queries.deleteTask).toHaveBeenCalledWith('p');
    expect(cancelTaskReminder).toHaveBeenCalledWith('p');
    expect(cancelTaskReminder).toHaveBeenCalledWith('c');
    const ids = useTaskStore.getState().tasks.map((t) => t.id);
    expect(ids).toEqual(['other']);
  });
});

describe('toggleTaskCompleted', () => {
  it('无子任务：切换自身完成态并取消提醒', async () => {
    setView([makeTask({ id: 't1', isCompleted: false })]);
    await useTaskStore.getState().toggleTaskCompleted('t1');
    expect(queries.updateTask).toHaveBeenCalledWith('t1', { isCompleted: true });
    expect(cancelTaskReminder).toHaveBeenCalledWith('t1');
    expect(useTaskStore.getState().tasks[0].isCompleted).toBe(true);
  });

  it('有子任务：级联切换并取消父子提醒', async () => {
    setView([
      makeTask({ id: 'p', isCompleted: false }),
      makeTask({ id: 'c', parentTaskId: 'p', isCompleted: false }),
    ]);
    await useTaskStore.getState().toggleTaskCompleted('p');
    expect(queries.setTaskAndChildrenCompleted).toHaveBeenCalledWith('p', true);
    expect(cancelTaskReminder).toHaveBeenCalledWith('p');
    expect(cancelTaskReminder).toHaveBeenCalledWith('c');
    const p = useTaskStore.getState().tasks.find((t) => t.id === 'p');
    const c = useTaskStore.getState().tasks.find((t) => t.id === 'c');
    expect(p?.isCompleted).toBe(true);
    expect(c?.isCompleted).toBe(true);
  });

  it('取消完成时不取消提醒', async () => {
    setView([makeTask({ id: 't1', isCompleted: true })]);
    (cancelTaskReminder as jest.Mock).mockClear();
    await useTaskStore.getState().toggleTaskCompleted('t1');
    expect(queries.updateTask).toHaveBeenCalledWith('t1', { isCompleted: false });
    expect(cancelTaskReminder).not.toHaveBeenCalled();
    expect(useTaskStore.getState().tasks[0].isCompleted).toBe(false);
  });
});

describe('reorderTasks', () => {
  it('按 taskIds 顺序重排内存任务', async () => {
    setView([makeTask({ id: 'a', order: 0 }), makeTask({ id: 'b', order: 1 }), makeTask({ id: 'c', order: 2 })]);
    await useTaskStore.getState().reorderTasks('daily', ['c', 'a', 'b']);
    expect(queries.updateTaskOrders).toHaveBeenCalledWith('daily', ['c', 'a', 'b']);
    expect(useTaskStore.getState().tasks.map((t) => t.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('moveTaskToDate', () => {
  it('更新父子日期并保留在视图内', async () => {
    setView([
      makeTask({ id: 'p', startDate: 1500 }),
      makeTask({ id: 'c', parentTaskId: 'p', startDate: 1500 }),
    ]);
    await useTaskStore.getState().moveTaskToDate('p', 1800);
    expect(queries.moveTaskToDate).toHaveBeenCalledWith('p', 1800, undefined);
    const c = useTaskStore.getState().tasks.find((t) => t.id === 'c');
    expect(c?.startDate).toBe(1800);
  });

  it('移出视图范围则从内存移除', async () => {
    setView([makeTask({ id: 'p', startDate: 1500 })]);
    await useTaskStore.getState().moveTaskToDate('p', 9999);
    expect(useTaskStore.getState().tasks).toHaveLength(0);
  });
});

describe('moveTaskToDateWithOrder', () => {
  it('同时更新日期与全局排序', async () => {
    setView([makeTask({ id: 'a', startDate: 1500 }), makeTask({ id: 'b', startDate: 1500 })]);
    await useTaskStore.getState().moveTaskToDateWithOrder('a', 1800, undefined, 'daily', ['b', 'a']);
    expect(queries.moveTaskToDate).toHaveBeenCalledWith('a', 1800, undefined);
    expect(queries.updateTaskOrders).toHaveBeenCalledWith('daily', ['b', 'a']);
    const tasks = useTaskStore.getState().tasks;
    expect(tasks.map((t) => t.id)).toEqual(['b', 'a']);
    expect(tasks.find((t) => t.id === 'a')?.startDate).toBe(1800);
  });

  it('移出视图时被拖任务移除，其余按序保留', async () => {
    setView([makeTask({ id: 'a', startDate: 1500 }), makeTask({ id: 'b', startDate: 1500 })]);
    await useTaskStore.getState().moveTaskToDateWithOrder('a', 9999, undefined, 'daily', ['a', 'b']);
    expect(useTaskStore.getState().tasks.map((t) => t.id)).toEqual(['b']);
  });
});
