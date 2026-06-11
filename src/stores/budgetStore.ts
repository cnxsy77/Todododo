import { create } from 'zustand';
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from '../types';
import * as queries from '../database/budgetQueries';

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadBudgets: () => Promise<void>;
  loadBudgetsByPeriod: (period: 'monthly' | 'yearly') => Promise<void>;
  addBudget: (input: CreateBudgetInput) => Promise<Budget>;
  updateBudget: (id: string, input: UpdateBudgetInput) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  getBudgetByCategoryId: (categoryId: string) => Budget | undefined;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  isLoading: false,
  error: null,

  loadBudgets: async () => {
    set({ isLoading: true, error: null });
    try {
      const budgets = await queries.getAllBudgets();
      set({ budgets, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  loadBudgetsByPeriod: async (period: 'monthly' | 'yearly') => {
    set({ isLoading: true, error: null });
    try {
      const budgets = await queries.getBudgetsByPeriod(period);
      set({ budgets, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addBudget: async (input: CreateBudgetInput) => {
    const newBudget = await queries.createBudget(input);
    set((state) => ({ budgets: [...state.budgets, newBudget] }));
    return newBudget;
  },

  updateBudget: async (id: string, input: UpdateBudgetInput) => {
    await queries.updateBudget(id, input);
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === id
          ? { ...b, ...input, updatedAt: Date.now() }
          : b
      ),
    }));
  },

  deleteBudget: async (id: string) => {
    await queries.deleteBudget(id);
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
    }));
  },

  getBudgetByCategoryId: (categoryId: string) => {
    return get().budgets.find((b) => b.categoryId === categoryId);
  },
}));