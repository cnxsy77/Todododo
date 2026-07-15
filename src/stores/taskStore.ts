import { create } from 'zustand';
import type { Task, CreateTaskInput, UpdateTaskInput, PlanType } from '../types';
import * as queries from '../database/queries';
import { scheduleTaskReminder, cancelTaskReminder } from '../services/notificationService';

// 判断任务是否属当前视图（planType 匹配 + startDate 落在某一 range 内）
const taskInView = (
  task: { planType: PlanType; startDate: number },
  planType: PlanType | null,
  ranges: { start: number; end: number }[] | null
): boolean => {
  if (!planType || !ranges || ranges.length === 0) return false;
  if (task.planType !== planType) return false;
  return ranges.some((r) => task.startDate >= r.start && task.startDate <= r.end);
};

interface TaskState {
  tasks: Task[];
  // 当前视图范围：store 仅持有属此视图的任务，写操作据此加入/移除
  currentPlanType: PlanType | null;
  currentRanges: { start: number; end: number }[] | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTasks: (planType?: PlanType, ranges?: { start: number; end: number }[]) => Promise<void>;
  addTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskCompleted: (id: string) => Promise<void>;
  reorderTasks: (planType: string, taskIds: string[]) => Promise<void>;
  moveTaskToDate: (id: string, newStart: number, newEnd?: number) => Promise<void>;
  // 跨天拖拽：同时更新任务日期与全局排序，单次 set 触发一次 UI 更新，
  // 避免 moveTaskToDate + reorderTasks 两次 set 导致 DraggableFlatList data
  // 变化两次引发的 cell 闪烁/残影。
  moveTaskToDateWithOrder: (
    id: string,
    newStart: number,
    newEnd: number | undefined,
    planType: string,
    taskIds: string[]
  ) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  currentPlanType: null,
  currentRanges: null,
  isLoading: false,
  error: null,

  // 传参则切换到该视图并加载；无参则用上次视图参数重新加载（供 import 后刷新）
  loadTasks: async (planType?: PlanType, ranges?: { start: number; end: number }[]) => {
    const pt = planType ?? get().currentPlanType;
    const rg = ranges ?? get().currentRanges;
    if (!pt || !rg) {
      set({ tasks: [], isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const tasks = await queries.getTasksByPlanTypeAndRanges(pt, rg);
      set({ tasks, currentPlanType: pt, currentRanges: rg, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addTask: async (input: CreateTaskInput) => {
    const newTask = await queries.createTask(input);
    // 仅当新任务属当前视图时加入内存（含子任务，父子同 range）
    const { currentPlanType, currentRanges } = get();
    if (taskInView(newTask, currentPlanType, currentRanges)) {
      set((state) => ({ tasks: [...state.tasks, newTask] }));
    }
    if (newTask.reminderAt) {
      await scheduleTaskReminder(newTask.id, newTask.title, newTask.reminderAt);
    }
    return newTask;
  },

  updateTask: async (id: string, input: UpdateTaskInput) => {
    await queries.updateTask(id, input);
    set((state) => {
      const { currentPlanType, currentRanges } = state;
      // 父任务的 planType/startDate/endDate 变更需级联到子任务
      const cascaded: Partial<Pick<Task, 'planType' | 'startDate' | 'endDate'>> = {};
      if (input.planType !== undefined) cascaded.planType = input.planType;
      if (input.startDate !== undefined) cascaded.startDate = input.startDate;
      // endDate: null 表示清除，归一化为 undefined 以保持 Task.endDate 类型（number | undefined）
      if (input.endDate !== undefined) cascaded.endDate = input.endDate ?? undefined;
      const hasCascade = Object.keys(cascaded).length > 0;
      const now = Date.now();
      const updated = state.tasks
        .map((task) => {
          if (task.id === id) {
            return {
              ...task,
              ...input,
              // ...input 会带入 endDate: null（清除），这里归一化为 undefined，保持 Task.endDate: number | undefined
              endDate: input.endDate === undefined ? task.endDate : (input.endDate ?? undefined),
              // reminderAt 同理归一化（null 清除 -> undefined）
              reminderAt: input.reminderAt === undefined ? task.reminderAt : (input.reminderAt ?? undefined),
              isCompleted: input.isCompleted ?? task.isCompleted,
              updatedAt: now,
            };
          }
          // 子任务跟随父任务的 planType/startDate/endDate
          if (hasCascade && task.parentTaskId === id) {
            return { ...task, ...cascaded, updatedAt: now };
          }
          return task;
        })
        // 更新后离开当前视图的任务（如改了日期/planType 到视图外）从内存移除
        .filter((task) => taskInView(task, currentPlanType, currentRanges));
      return { tasks: updated };
    });

    // 提醒变更：取消旧的，按新值重新调度（null 清除则仅取消）
    if (input.reminderAt !== undefined) {
      if (input.reminderAt === null) {
        await cancelTaskReminder(id);
      } else {
        const task = get().tasks.find((t) => t.id === id);
        await scheduleTaskReminder(id, task?.title ?? '', input.reminderAt);
      }
    }
  },

  deleteTask: async (id: string) => {
    // 取消该任务及其子任务的提醒
    await cancelTaskReminder(id);
    const children = get().tasks.filter((t) => t.parentTaskId === id);
    await Promise.all(children.map((c) => cancelTaskReminder(c.id)));
    await queries.deleteTask(id);
    set((state) => ({
      // 同时移除该任务及其所有子任务
      tasks: state.tasks.filter(
        (task) => task.id !== id && task.parentTaskId !== id
      ),
    }));
  },

  toggleTaskCompleted: async (id: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const target = !task.isCompleted;
    const hasChildren = get().tasks.some((t) => t.parentTaskId === id);
    // 有子任务时级联完成；否则仅切换自身
    if (hasChildren) {
      await queries.setTaskAndChildrenCompleted(id, target);
    } else {
      await queries.updateTask(id, { isCompleted: target });
    }
    // 完成时取消提醒（已完成不再打扰）；取消完成不自动恢复
    if (target) {
      await cancelTaskReminder(id);
      const children = get().tasks.filter((t) => t.parentTaskId === id);
      await Promise.all(children.map((c) => cancelTaskReminder(c.id)));
    }
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id || t.parentTaskId === id
          ? { ...t, isCompleted: target }
          : t
      ),
    }));
  },

  reorderTasks: async (planType: string, taskIds: string[]) => {
    await queries.updateTaskOrders(planType, taskIds);
    // 更新本地状态：按照 taskIds 的顺序重新排列 tasks
    set((state) => {
      // 创建任务 ID 到任务对象的映射
      const taskMap = new Map(state.tasks.map((t) => [t.id, t]));
      // 按照 taskIds 顺序重新构建 tasks 数组
      const reorderedTasks = taskIds
        .map((id) => taskMap.get(id))
        .filter((t): t is Task => t !== undefined);
      // 添加不在 taskIds 中的任务（如果有）
      state.tasks.forEach((task) => {
        if (!taskIds.includes(task.id)) {
          reorderedTasks.push(task);
        }
      });
      return { tasks: reorderedTasks };
    });
  },

  moveTaskToDate: async (id: string, newStart: number, newEnd?: number) => {
    // 非乐观：先写库再 set。set 时机滞后于 DraggableFlatList 的 onDragEnd 收尾动画，
    // 配合 useTasksByRanges 的 useEffect 异步派生，让 data prop 变化晚于库收尾，
    // 避免同帧竞争导致 cell translateY 残留。拖拽后的即时视觉由 TaskList 的
    // localRenderData + pendingSyncRef 负责，不依赖此处乐观更新。
    await queries.moveTaskToDate(id, newStart, newEnd);
    set((state) => {
      const { currentPlanType, currentRanges } = state;
      const updated = state.tasks
        .map((task) => {
          if (task.id === id) {
            return { ...task, startDate: newStart, endDate: newEnd, updatedAt: Date.now() };
          }
          // 子任务跟随父任务日期，保证父子始终同 range
          if (task.parentTaskId === id) {
            return { ...task, startDate: newStart, endDate: newEnd, updatedAt: Date.now() };
          }
          return task;
        })
        .filter((task) => taskInView(task, currentPlanType, currentRanges));
      return { tasks: updated };
    });
  },

  moveTaskToDateWithOrder: async (
    id: string,
    newStart: number,
    newEnd: number | undefined,
    planType: string,
    taskIds: string[]
  ) => {
    // 非乐观：先写库再 set（与 moveTaskToDate 一致）。set 滞后于 onDragEnd 收尾，
    // 配合 useTasksByRanges 的 useEffect 异步派生，避免同帧竞争导致 cell 残留。
    // 同时改 startDate 与全局顺序，使 props 回流后顺序与 TaskList 的 localRenderData
    // 一致（跨日拖拽到目标日期某位置时，顺序不会在回流后被 store 原顺序覆盖）。
    try {
      await queries.moveTaskToDate(id, newStart, newEnd);
      await queries.updateTaskOrders(planType, taskIds);
      set((state) => {
        const { currentPlanType, currentRanges } = state;
        // 先更新被拖任务及其子任务的日期，并移除离开当前视图的任务
        const withDate = state.tasks
          .map((task) => {
            if (task.id === id || task.parentTaskId === id) {
              return { ...task, startDate: newStart, endDate: newEnd, updatedAt: Date.now() };
            }
            return task;
          })
          .filter((task) => taskInView(task, currentPlanType, currentRanges));
        // 再按 taskIds 顺序重排（taskIds 中的按序，其余追加末尾）
        const taskMap = new Map(withDate.map((t) => [t.id, t]));
        const reordered = taskIds
          .map((tid) => taskMap.get(tid))
          .filter((t): t is Task => t !== undefined);
        withDate.forEach((task) => {
          if (!taskIds.includes(task.id)) {
            reordered.push(task);
          }
        });
        return { tasks: reordered };
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
}));
