import { create } from 'zustand';
import type { Category, CreateCategoryInput } from '../types';
import * as queries from '../database/categoryQueries';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadCategories: () => Promise<void>;
  loadCategoriesByType: (type: 'income' | 'expense') => Promise<void>;
  addCategory: (input: CreateCategoryInput) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoriesByType: (type: 'income' | 'expense') => Category[];
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  loadCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await queries.getAllCategories();
      set({ categories, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  loadCategoriesByType: async (type: 'income' | 'expense') => {
    set({ isLoading: true, error: null });
    try {
      const categories = await queries.getCategoriesByType(type);
      set({ categories, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addCategory: async (input: CreateCategoryInput) => {
    const newCategory = await queries.createCategory(input);
    set((state) => ({ categories: [...state.categories, newCategory] }));
    return newCategory;
  },

  deleteCategory: async (id: string) => {
    await queries.deleteCategory(id);
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
  },

  getCategoryById: (id: string) => {
    return get().categories.find((c) => c.id === id);
  },

  getCategoriesByType: (type: 'income' | 'expense') => {
    return get().categories.filter((c) => c.type === type);
  },
}));