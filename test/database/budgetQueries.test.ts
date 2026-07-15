jest.mock('../../src/database/schema', () => {
  const fakeDb = {
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 0, changes: 0 })),
    execAsync: jest.fn(() => Promise.resolve()),
    withTransactionAsync: jest.fn((cb: any) => cb()),
  };
  return { getDatabase: jest.fn(() => Promise.resolve(fakeDb)) };
});

import {
  getAllBudgets,
  getBudgetsByPeriod,
  getBudgetByCategoryId,
  createBudget,
  updateBudget,
  deleteBudget,
} from '../../src/database/budgetQueries';
import { getDatabase } from '../../src/database/schema';

const getDb = async () => {
  const db = await getDatabase();
  return db as unknown as {
    getAllAsync: jest.Mock;
    getFirstAsync: jest.Mock;
    runAsync: jest.Mock;
  };
};

const row = (overrides: Record<string, any> = {}) => ({
  id: 'budget_1',
  category_id: 'cat_1',
  amount: 1000,
  period: 'monthly',
  created_at: 900,
  updated_at: 950,
  ...overrides,
});

beforeEach(async () => {
  jest.clearAllMocks();
  const db = await getDb();
  db.getAllAsync.mockResolvedValue([]);
  db.getFirstAsync.mockResolvedValue(null);
});

describe('budgetQueries mapRow', () => {
  it('category_id -> categoryId', async () => {
    const db = await getDb();
    db.getAllAsync.mockResolvedValue([row()]);
    const [b] = await getAllBudgets();
    expect(b).toEqual({ id: 'budget_1', categoryId: 'cat_1', amount: 1000, period: 'monthly', createdAt: 900, updatedAt: 950 });
  });
});

describe('getAllBudgets', () => {
  it('按 period, created_at 排序', async () => {
    const db = await getDb();
    await getAllBudgets();
    expect(db.getAllAsync.mock.calls[0][0]).toBe('SELECT * FROM budgets ORDER BY period, created_at ASC');
  });
});

describe('getBudgetsByPeriod', () => {
  it('WHERE period = ?', async () => {
    const db = await getDb();
    await getBudgetsByPeriod('yearly');
    const [sql, params] = db.getAllAsync.mock.calls[0];
    expect(sql).toBe('SELECT * FROM budgets WHERE period = ? ORDER BY created_at ASC');
    expect(params).toEqual(['yearly']);
  });
});

describe('getBudgetByCategoryId', () => {
  it('存在/不存在', async () => {
    const db = await getDb();
    db.getFirstAsync.mockResolvedValueOnce(row({ category_id: 'cat_x' }));
    expect((await getBudgetByCategoryId('cat_x'))?.categoryId).toBe('cat_x');
    expect(await getBudgetByCategoryId('missing')).toBeUndefined();
  });
});

describe('createBudget', () => {
  it('id 以 budget_ 前缀，插入 6 列，返回对象', async () => {
    const db = await getDb();
    const b = await createBudget({ categoryId: 'cat_1', amount: 2000, period: 'monthly' });
    expect(b.id).toMatch(/^budget_/);
    expect(b.categoryId).toBe('cat_1');
    expect(b.amount).toBe(2000);
    expect(b.period).toBe('monthly');

    const [sql, params] = db.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO budgets');
    expect(params).toHaveLength(6);
    expect(params[0]).toMatch(/^budget_/);
    expect(params[1]).toBe('cat_1');
    expect(params[2]).toBe(2000);
    expect(params[3]).toBe('monthly');
  });
});

describe('updateBudget', () => {
  it('动态 SQL 拼接 amount/period + updated_at', async () => {
    const db = await getDb();
    await updateBudget('budget_1', { amount: 3000, period: 'yearly' });
    const [sql, params] = db.runAsync.mock.calls[0];
    expect(sql).toBe('UPDATE budgets SET amount = ?, period = ?, updated_at = ? WHERE id = ?');
    expect(params[0]).toBe(3000);
    expect(params[1]).toBe('yearly');
    expect(params[3]).toBe('budget_1');
  });
});

describe('deleteBudget', () => {
  it('按 id 删除', async () => {
    const db = await getDb();
    await deleteBudget('budget_1');
    expect(db.runAsync.mock.calls[0]).toEqual(['DELETE FROM budgets WHERE id = ?', ['budget_1']]);
  });
});
