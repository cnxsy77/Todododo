// 交易类型
export type TransactionType = 'income' | 'expense';

// 交易记录
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string; // category id or name
  note?: string;
  date: number; // timestamp
  createdAt: number;
  updatedAt: number;
}

// 创建交易输入
export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  note?: string;
  date: number;
}

// 更新交易输入
export interface UpdateTransactionInput {
  type?: TransactionType;
  amount?: number;
  category?: string;
  note?: string;
  date?: number;
}

// 分类
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  createdAt: number;
}

// 创建分类输入
export interface CreateCategoryInput {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

// 预算周期
export type BudgetPeriod = 'monthly' | 'yearly';

// 预算
export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  createdAt: number;
  updatedAt: number;
}

// 创建预算输入
export interface CreateBudgetInput {
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
}

// 更新预算输入
export interface UpdateBudgetInput {
  amount?: number;
  period?: BudgetPeriod;
}

// 统计数据
export interface TransactionStatistics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  dailyData: Array<{ date: number; income: number; expense: number }>;
  monthlyData: Array<{ month: number; year: number; income: number; expense: number }>;
}