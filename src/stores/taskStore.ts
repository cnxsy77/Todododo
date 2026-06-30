import { create } from 'zustand';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types';
import * as queries from '../database/queries';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTasks: () => Promise<void>;
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
  isLoading: false,
  error: null,

  loadTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await queries.getAllTasks();
      set({ tasks, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addTask: async (input: CreateTaskInput) => {
    const newTask = await queries.createTask(input);
    set((state) => ({ tasks: [...state.tasks, newTask] }));
    return newTask;
  },

  updateTask: async (id: string, input: UpdateTaskInput) => {
    await queries.updateTask(id, input);
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              ...input,
              isCompleted: input.isCompleted ?? task.isCompleted,
              updatedAt: Date.now(),
            }
          : task
      ),
    }));
  },

  deleteTask: async (id: string) => {
    await queries.deleteTask(id);
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
  },

  toggleTaskCompleted: async (id: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (task) {
      await queries.updateTask(id, { isCompleted: !task.isCompleted });
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
        ),
      }));
    }
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
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, startDate: newStart, endDate: newEnd, updatedAt: Date.now() }
          : task
      ),
    }));
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
        // 先更新被拖任务的日期
        const withDate = state.tasks.map((task) =>
          task.id === id
            ? { ...task, startDate: newStart, endDate: newEnd, updatedAt: Date.now() }
            : task
        );
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
