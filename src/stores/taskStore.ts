import { create } from 'zustand';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types';
import * as queries from '../database/queries';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTasks: () => Promise<void>;
  loadTasksByPlanType: (planType: string) => Promise<void>;
  loadTasksByDateRange: (start: number, end: number) => Promise<void>;
  addTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskCompleted: (id: string) => Promise<void>;
  reorderTasks: (planType: string, taskIds: string[]) => Promise<void>;
  moveTaskToDate: (id: string, newStart: number, newEnd?: number) => Promise<void>;
  searchTasks: (query: string) => Promise<void>;
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

  loadTasksByPlanType: async (planType: string) => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await queries.getTasksByPlanType(planType);
      set({ tasks, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  loadTasksByDateRange: async (start: number, end: number) => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await queries.getTasksByDateRange(start, end);
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
    // 本地更新会在组件中处理
  },

  moveTaskToDate: async (id: string, newStart: number, newEnd?: number) => {
    await queries.moveTaskToDate(id, newStart, newEnd);
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, startDate: newStart, endDate: newEnd, updatedAt: Date.now() }
          : task
      ),
    }));
  },

  searchTasks: async (query: string) => {
    const tasks = await queries.searchTasks(query);
    set({ tasks });
  },
}));
