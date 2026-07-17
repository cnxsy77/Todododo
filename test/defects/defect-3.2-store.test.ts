// 3.2 缺陷探测（store 层）
// 本文件为“缺陷探测器”：断言缺陷行为仍然成立。测试通过 = 缺陷仍存在。
// mock 策略与 test/stores/taskStore.test.ts 一致：mock queries + notificationService，
// 跑真实 zustand store 状态机。

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

// 视图：daily，range 足够宽以容纳拖拽后的新日期（便于观察 planType 是否被改）
const WIDE_RANGE = [{ start: 1000, end: 9000 }];
const setView = (tasks: Task[] = []) =>
  useTaskStore.setState({
    tasks,
    currentPlanType: 'daily',
    currentRanges: WIDE_RANGE,
    isLoading: false,
    error: null,
  });

beforeEach(() => {
  jest.clearAllMocks();
  (queries.getTasksByPlanTypeAndRanges as jest.Mock).mockResolvedValue([]);
  setView([]);
});

// -----------------------------------------------------------------------
// 缺陷1：moveTaskToDate 不更新 plan_type（store 调用链层面）
// 探测点：store.moveTaskToDate / moveTaskToDateWithOrder 不会改任务 planType，
//        且调用 queries.moveTaskToDate 时不传目标 planType。
// -----------------------------------------------------------------------
describe('缺陷1探测：store 层跨视图拖拽不改 planType（期望缺陷仍存在）', () => {
  it('moveTaskToDate 调用 queries.moveTaskToDate 仅传 (id, newStart, newEnd)，未传 planType', async () => {
    setView([makeTask({ id: 't1', planType: 'daily', startDate: 1500 })]);
    await useTaskStore.getState().moveTaskToDate('t1', 5000);
    expect(queries.moveTaskToDate).toHaveBeenCalledWith('t1', 5000, undefined);
    // 未走 updateTask 改 planType
    expect(queries.updateTask).not.toHaveBeenCalled();
  });

  it('moveTaskToDateWithOrder 把 planType 传给 updateTaskOrders，但 queries.moveTaskToDate 仍不接收 planType', async () => {
    setView([makeTask({ id: 't1', planType: 'daily', startDate: 1500 })]);
    await useTaskStore
      .getState()
      .moveTaskToDateWithOrder('t1', 5000, undefined, 'daily', ['t1']);
    // 日期更新调用不传 planType
    expect(queries.moveTaskToDate).toHaveBeenCalledWith('t1', 5000, undefined);
    // planType 仅流到 updateTaskOrders（其 _planType 参数在 queries 内未使用，见 queries 探测）
    expect(queries.updateTaskOrders).toHaveBeenCalledWith('daily', ['t1']);
    expect(queries.updateTask).not.toHaveBeenCalled();
  });

  it('拖拽后仍在视图内的任务 planType 保持原值（daily 不会随日期变更）', async () => {
    setView([makeTask({ id: 't1', planType: 'daily', startDate: 1500 })]);
    await useTaskStore.getState().moveTaskToDate('t1', 5000); // 5000 仍在 WIDE_RANGE 内
    const t = useTaskStore.getState().tasks.find((x) => x.id === 't1');
    expect(t).toBeDefined();
    expect(t!.planType).toBe('daily'); // 仍是 daily，未被改成目标视图的 planType
    expect(t!.startDate).toBe(5000);
  });
});

// -----------------------------------------------------------------------
// 缺陷2：updateTaskOrders 全量重排（store 调用链层面）
// 探测点：store.reorderTasks 把传入的全部 taskIds 透传给 queries.updateTaskOrders，
//        不区分被拖日期与其他日期。
// -----------------------------------------------------------------------
describe('缺陷2探测：store.reorderTasks 透传全部 id 给 updateTaskOrders（期望缺陷仍存在）', () => {
  it('同日期重排传入所有 range id 时，全部透传给 updateTaskOrders（含其他日期）', async () => {
    setView([
      makeTask({ id: 'a1', startDate: 1500, order: 0 }),
      makeTask({ id: 'a2', startDate: 1500, order: 1 }),
      makeTask({ id: 'b1', startDate: 8000, order: 2 }),
      makeTask({ id: 'b2', startDate: 8000, order: 3 }),
    ]);
    // 模拟 TaskList 同日期重排：用户只拖 a2/a1，但 onReorder 透传了全部 id
    await useTaskStore.getState().reorderTasks('daily', ['a2', 'a1', 'b1', 'b2']);
    // 全部 4 个 id（含其他日期 b1/b2）被透传，updateTaskOrders 将对全部重编号
    expect(queries.updateTaskOrders).toHaveBeenCalledWith('daily', [
      'a2',
      'a1',
      'b1',
      'b2',
    ]);
  });
});
