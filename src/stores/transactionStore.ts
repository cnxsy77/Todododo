import { create } from 'zustand';
import type { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionStatistics } from '../types';
import * as queries from '../database/transactionQueries';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTransactions: () => Promise<void>;
  loadTransactionsByType: (type: 'income' | 'expense') => Promise<void>;
  loadTransactionsByDateRange: (start: number, end: number) => Promise<void>;
  addTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, input: UpdateTransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getStatistics: (startDate?: number, endDate?: number) => TransactionStatistics;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,

  loadTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await queries.getAllTransactions();
      set({ transactions, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  loadTransactionsByType: async (type: 'income' | 'expense') => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await queries.getTransactionsByType(type);
      set({ transactions, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  loadTransactionsByDateRange: async (start: number, end: number) => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await queries.getTransactionsByDateRange(start, end);
      set({ transactions, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addTransaction: async (input: CreateTransactionInput) => {
    const newTransaction = await queries.createTransaction(input);
    set((state) => ({ transactions: [newTransaction, ...state.transactions] }));
    return newTransaction;
  },

  updateTransaction: async (id: string, input: UpdateTransactionInput) => {
    await queries.updateTransaction(id, input);
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id
          ? { ...t, ...input, updatedAt: Date.now() }
          : t
      ),
    }));
  },

  deleteTransaction: async (id: string) => {
    await queries.deleteTransaction(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  getStatistics: (startDate?: number, endDate?: number) => {
    const { transactions } = get();
    const filtered = transactions.filter((t) => {
      if (startDate && endDate) {
        return t.date >= startDate && t.date <= endDate;
      }
      return true;
    });

    const totalIncome = filtered
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filtered
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    const dailyData: Record<string, { date: number; income: number; expense: number }> = {};
    const monthlyData: Record<string, { month: number; year: number; income: number; expense: number }> = {};

    filtered.forEach((t) => {
      // 按分类统计
      if (t.type === 'income') {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      } else {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      }

      // 按日期统计
      const dateKey = new Date(t.date).toDateString();
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: t.date, income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        dailyData[dateKey].income += t.amount;
      } else {
        dailyData[dateKey].expense += t.amount;
      }

      // 按月统计
      const d = new Date(t.date);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: d.getMonth(), year: d.getFullYear(), income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        monthlyData[monthKey].income += t.amount;
      } else {
        monthlyData[monthKey].expense += t.amount;
      }
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeByCategory,
      expenseByCategory,
      dailyData: Object.values(dailyData).sort((a, b) => a.date - b.date),
      monthlyData: Object.values(monthlyData).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      }),
    };
  },
}));