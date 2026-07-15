jest.mock('../../src/database/budgetQueries', () => ({
  getAllBudgets: jest.fn(() => Promise.resolve([])),
  getBudgetsByPeriod: jest.fn(() => Promise.resolve([])),
  createBudget: jest.fn(),
  updateBudget: jest.fn(() => Promise.resolve()),
  deleteBudget: jest.fn(() => Promise.resolve()),
}));

import { useBudgetStore } from '../../src/stores/budgetStore';
import * as queries from '../../src/database/budgetQueries';
import type { Budget } from '../../src/types';

const makeBudget = (o: Partial<Budget> = {}): Budget => ({
  id: 'budget_1',
  categoryId: 'cat_1',
  amount: 1000,
  period: 'monthly',
  createdAt: 100,
  updatedAt: 100,
  ...o,
});

const reset = () =>
  useBudgetStore.setState({ budgets: [], isLoading: false, error: null });

beforeEach(() => {
  jest.clearAllMocks();
  reset();
});

describe('loadBudgets', () => {
  it('加载全部', async () => {
    (queries.getAllBudgets as jest.Mock).mockResolvedValue([makeBudget({ id: 'a' })]);
    await useBudgetStore.getState().loadBudgets();
    expect(useBudgetStore.getState().budgets).toHaveLength(1);
  });

  it('loadBudgetsByPeriod 传参', async () => {
    (queries.getBudgetsByPeriod as jest.Mock).mockResolvedValue([makeBudget({ period: 'yearly' })]);
    await useBudgetStore.getState().loadBudgetsByPeriod('yearly');
    expect(queries.getBudgetsByPeriod).toHaveBeenCalledWith('yearly');
  });
});

describe('addBudget', () => {
  it('新建并追加', async () => {
    (queries.createBudget as jest.Mock).mockResolvedValue(makeBudget({ id: 'new' }));
    useBudgetStore.setState({ budgets: [makeBudget({ id: 'old' })] });
    await useBudgetStore.getState().addBudget({ categoryId: 'cat_1', amount: 2000, period: 'monthly' });
    expect(useBudgetStore.getState().budgets.map((b) => b.id)).toEqual(['old', 'new']);
  });
});

describe('updateBudget', () => {
  it('更新字段并刷新 updatedAt', async () => {
    useBudgetStore.setState({ budgets: [makeBudget({ id: 'b1', amount: 1000, updatedAt: 100 })] });
    await useBudgetStore.getState().updateBudget('b1', { amount: 3000 });
    expect(queries.updateBudget).toHaveBeenCalledWith('b1', { amount: 3000 });
    const b = useBudgetStore.getState().budgets[0];
    expect(b.amount).toBe(3000);
    expect(b.updatedAt).toBeGreaterThan(100);
  });
});

describe('deleteBudget', () => {
  it('按 id 移除', async () => {
    useBudgetStore.setState({ budgets: [makeBudget({ id: 'a' }), makeBudget({ id: 'b' })] });
    await useBudgetStore.getState().deleteBudget('a');
    expect(queries.deleteBudget).toHaveBeenCalledWith('a');
    expect(useBudgetStore.getState().budgets.map((b) => b.id)).toEqual(['b']);
  });
});

describe('getBudgetByCategoryId', () => {
  it('按 categoryId 查找', () => {
    useBudgetStore.setState({
      budgets: [
        makeBudget({ id: 'b1', categoryId: 'cat_x' }),
        makeBudget({ id: 'b2', categoryId: 'cat_y' }),
      ],
    });
    expect(useBudgetStore.getState().getBudgetByCategoryId('cat_y')?.id).toBe('b2');
    expect(useBudgetStore.getState().getBudgetByCategoryId('missing')).toBeUndefined();
  });
});
