jest.mock('../../src/database/transactionQueries', () => ({
  getAllTransactions: jest.fn(() => Promise.resolve([])),
  getTransactionsByType: jest.fn(() => Promise.resolve([])),
  getTransactionsByDateRange: jest.fn(() => Promise.resolve([])),
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(() => Promise.resolve()),
  deleteTransaction: jest.fn(() => Promise.resolve()),
}));

import { useTransactionStore } from '../../src/stores/transactionStore';
import * as queries from '../../src/database/transactionQueries';
import type { Transaction } from '../../src/types';

const makeTxn = (o: Partial<Transaction> = {}): Transaction => ({
  id: 't1',
  type: 'expense',
  amount: 10,
  category: 'food',
  date: 1000,
  createdAt: 100,
  updatedAt: 100,
  ...o,
});

const reset = () =>
  useTransactionStore.setState({ transactions: [], isLoading: false, error: null });

beforeEach(() => {
  jest.clearAllMocks();
  (queries.getAllTransactions as jest.Mock).mockResolvedValue([]);
  reset();
});

describe('loadTransactions', () => {
  it('加载全部', async () => {
    (queries.getAllTransactions as jest.Mock).mockResolvedValue([makeTxn({ id: 'a' })]);
    await useTransactionStore.getState().loadTransactions();
    expect(queries.getAllTransactions).toHaveBeenCalled();
    expect(useTransactionStore.getState().transactions).toHaveLength(1);
    expect(useTransactionStore.getState().isLoading).toBe(false);
  });

  it('loadTransactionsByType 传参', async () => {
    (queries.getTransactionsByType as jest.Mock).mockResolvedValue([makeTxn({ type: 'income' })]);
    await useTransactionStore.getState().loadTransactionsByType('income');
    expect(queries.getTransactionsByType).toHaveBeenCalledWith('income');
  });

  it('loadTransactionsByDateRange 传参', async () => {
    await useTransactionStore.getState().loadTransactionsByDateRange(100, 200);
    expect(queries.getTransactionsByDateRange).toHaveBeenCalledWith(100, 200);
  });
});

describe('addTransaction', () => {
  it('新建并前置到列表', async () => {
    (queries.createTransaction as jest.Mock).mockResolvedValue(makeTxn({ id: 'new' }));
    reset();
    useTransactionStore.setState({ transactions: [makeTxn({ id: 'old' })] });
    await useTransactionStore.getState().addTransaction({
      type: 'expense', amount: 10, category: 'food', date: 1000,
    });
    expect(useTransactionStore.getState().transactions.map((t) => t.id)).toEqual(['new', 'old']);
  });
});

describe('updateTransaction', () => {
  it('更新字段回流', async () => {
    useTransactionStore.setState({ transactions: [makeTxn({ id: 't1', amount: 10 })] });
    await useTransactionStore.getState().updateTransaction('t1', { amount: 99 });
    expect(queries.updateTransaction).toHaveBeenCalledWith('t1', { amount: 99 });
    expect(useTransactionStore.getState().transactions[0].amount).toBe(99);
  });
});

describe('deleteTransaction', () => {
  it('按 id 移除', async () => {
    useTransactionStore.setState({
      transactions: [makeTxn({ id: 'a' }), makeTxn({ id: 'b' })],
    });
    await useTransactionStore.getState().deleteTransaction('a');
    expect(queries.deleteTransaction).toHaveBeenCalledWith('a');
    expect(useTransactionStore.getState().transactions.map((t) => t.id)).toEqual(['b']);
  });
});

describe('getStatistics', () => {
  const jul15 = new Date(2026, 6, 15, 12, 0).getTime();
  const jul20 = new Date(2026, 6, 20, 12, 0).getTime();
  const jun10 = new Date(2026, 5, 10, 12, 0).getTime();

  const txns: Transaction[] = [
    makeTxn({ id: '1', type: 'income', amount: 100, category: 'salary', date: jul15 }),
    makeTxn({ id: '2', type: 'expense', amount: 30, category: 'food', date: jul15 }),
    makeTxn({ id: '3', type: 'expense', amount: 20, category: 'food', date: jul20 }),
    makeTxn({ id: '4', type: 'income', amount: 50, category: 'bonus', date: jun10 }),
  ];

  beforeEach(() => useTransactionStore.setState({ transactions: txns }));

  it('收支总额与结余', () => {
    const s = useTransactionStore.getState().getStatistics();
    expect(s.totalIncome).toBe(150);
    expect(s.totalExpense).toBe(50);
    expect(s.balance).toBe(100);
  });

  it('分类占比', () => {
    const s = useTransactionStore.getState().getStatistics();
    expect(s.incomeByCategory).toEqual({ salary: 100, bonus: 50 });
    expect(s.expenseByCategory).toEqual({ food: 50 });
  });

  it('按日聚合并按日期升序', () => {
    const s = useTransactionStore.getState().getStatistics();
    expect(s.dailyData).toHaveLength(3);
    expect(s.dailyData.map((d) => d.date)).toEqual([jun10, jul15, jul20]);
    const jul15Data = s.dailyData.find((d) => d.date === jul15)!;
    expect(jul15Data.income).toBe(100);
    expect(jul15Data.expense).toBe(30);
  });

  it('按月聚合并按年月升序', () => {
    const s = useTransactionStore.getState().getStatistics();
    expect(s.monthlyData).toEqual([
      { month: 5, year: 2026, income: 50, expense: 0 },
      { month: 6, year: 2026, income: 100, expense: 50 },
    ]);
  });

  it('日期范围过滤', () => {
    const start = new Date(2026, 6, 15, 0, 0).getTime();
    const end = new Date(2026, 6, 15, 23, 59, 59).getTime();
    const s = useTransactionStore.getState().getStatistics(start, end);
    expect(s.totalIncome).toBe(100);
    expect(s.totalExpense).toBe(30);
  });

  it('空交易返回零值结构', () => {
    useTransactionStore.setState({ transactions: [] });
    const s = useTransactionStore.getState().getStatistics();
    expect(s).toEqual({
      totalIncome: 0, totalExpense: 0, balance: 0,
      incomeByCategory: {}, expenseByCategory: {},
      dailyData: [], monthlyData: [],
    });
  });
});
