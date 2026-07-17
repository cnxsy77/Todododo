// 3.2 缺陷探测（database/queries 层）
// 本文件为“缺陷探测器”：断言缺陷行为仍然成立。测试通过 = 缺陷仍存在；
// 若源码修复了缺陷，对应断言会失败（变红），即提示缺陷已消除。
//
// mock 策略与 test/database/queries.test.ts 一致：mock schema 返回 fake db，
// 跑真实 queries 逻辑，验证 SQL 字符串构建与参数绑定。

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

import { moveTaskToDate, updateTaskOrders } from '../../src/database/queries';
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

beforeEach(async () => {
  jest.clearAllMocks();
  const db = await getDb();
  db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 0 });
});

// -----------------------------------------------------------------------
// 缺陷1：moveTaskToDate 不更新 plan_type
// 文档 3.2：“仅改 start_date/end_date。将 daily 任务拖到 weekly 范围后，
//           切到周视图按 planType 过滤时该任务可能消失。”
// 探测点：moveTaskToDate 生成的 UPDATE 语句是否包含 plan_type 列。
// -----------------------------------------------------------------------
describe('缺陷1探测：moveTaskToDate 不更新 plan_type（期望缺陷仍存在）', () => {
  it('更新自身的 SQL 仅含 start_date/end_date/updated_at，不含 plan_type', async () => {
    const db = await getDb();
    await moveTaskToDate('t1', 5000, 6000);
    const selfSql: string = db.runAsync.mock.calls[0][0];
    expect(selfSql).toContain('start_date = ?');
    expect(selfSql).toContain('end_date = ?');
    // 缺陷核心：plan_type 未出现在 UPDATE 列中
    expect(selfSql).not.toContain('plan_type');
  });

  it('级联更新子任务的 SQL 同样不含 plan_type', async () => {
    const db = await getDb();
    await moveTaskToDate('t1', 5000);
    const childSql: string = db.runAsync.mock.calls[1][0];
    expect(childSql).toContain('start_date = ?');
    expect(childSql).not.toContain('plan_type');
  });

  it('跨视图拖拽（目标 range 属 weekly）后 plan_type 不变——切周视图会消失', async () => {
    const db = await getDb();
    // 任务原 plan_type=daily，拖到某 weekly 范围的 start_date
    await moveTaskToDate('t1', 5000);
    // 无论目标落在哪个视图范围，UPDATE 都不会改 plan_type
    const calls = db.runAsync.mock.calls as [string, any[]][];
    calls.forEach(([sql]) => {
      expect(sql).not.toContain('plan_type');
    });
  });
});

// -----------------------------------------------------------------------
// 缺陷2：updateTaskOrders 全量重排
// 文档 3.2：“分组模式同日期重排分支把所有范围的任务 ID 传给 onReorder，
//           对全部重新编号。重载后可能打乱其他日期的排序。”
// 探测点：
//  1) updateTaskOrders 对传入的全部 taskIds（含其他日期）从 0 连续重编号；
//  2) _planType 参数未参与 SQL（不按 plan_type 限定范围），即“全量”重排。
// -----------------------------------------------------------------------
describe('缺陷2探测：updateTaskOrders 全量重排（期望缺陷仍存在）', () => {
  it('传入所有 range id 时全部被连续重编号，含“其他日期”任务', async () => {
    const db = await getDb();
    // 模拟 TaskList 同日期重排分支：newData 含日期A(a1,a2) + 日期B(b1,b2) 全部 id
    // 用户只在 A 内拖动，但 onReorder 透传了所有 range 的 id
    await updateTaskOrders('daily', ['a2', 'a1', 'b1', 'b2']);
    expect(db.runAsync).toHaveBeenCalledTimes(4);
    // 全部 4 个 id 被重写 sort_order=0..3，包括“其他日期”的 b1/b2
    expect(db.runAsync.mock.calls[0][1]).toEqual([0, expect.any(Number), 'a2']);
    expect(db.runAsync.mock.calls[1][1]).toEqual([1, expect.any(Number), 'a1']);
    expect(db.runAsync.mock.calls[2][1]).toEqual([2, expect.any(Number), 'b1']); // 其他日期任务也被重编号
    expect(db.runAsync.mock.calls[3][1]).toEqual([3, expect.any(Number), 'b2']);
  });

  it('UPDATE 语句不按 plan_type 限定范围（_planType 参数未使用）', async () => {
    const db = await getDb();
    await updateTaskOrders('daily', ['a', 'b']);
    const sql: string = db.runAsync.mock.calls[0][0];
    // 仅按 id 定位，无 plan_type WHERE 条件，即不限定范围
    expect(sql).toBe('UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?');
    expect(sql).not.toContain('plan_type');
  });
});
