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
  getAllTransactions,
  getTransactionsByType,
  getTransactionsByDateRange,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../../src/database/transactionQueries';
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
  id: 'txn1',
  type: 'expense',
  amount: 50,
  category: 'food',
  note: null,
  date: 1000,
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

describe('transactionQueries mapRow', () => {
  it('note 为 null -> undefined', async () => {
    const db = await getDb();
    db.getAllAsync.mockResolvedValue([row({ note: null })]);
    const [t] = await getAllTransactions();
    expect(t.note).toBeUndefined();
    expect(t).toMatchObject({ id: 'txn1', type: 'expense', amount: 50, category: 'food', date: 1000, createdAt: 900, updatedAt: 950 });
  });
});

describe('getAllTransactions', () => {
  it('按 date DESC, created_at DESC 排序', async () => {
    const db = await getDb();
    db.getAllAsync.mockResolvedValue([row({ id: 'a' })]);
    await getAllTransactions();
    expect(db.getAllAsync.mock.calls[0][0]).toBe(
      'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
    );
  });
});

describe('getTransactionsByType', () => {
  it('WHERE type = ? 带参数', async () => {
    const db = await getDb();
    await getTransactionsByType('income');
    const [sql, params] = db.getAllAsync.mock.calls[0];
    expect(sql).toBe('SELECT * FROM transactions WHERE type = ? ORDER BY date DESC, created_at DESC');
    expect(params).toEqual(['income']);
  });
});

describe('getTransactionsByDateRange', () => {
  it('WHERE date BETWEEN 带 start/end 参数', async () => {
    const db = await getDb();
    await getTransactionsByDateRange(100, 200);
    const [sql, params] = db.getAllAsync.mock.calls[0];
    expect(sql).toBe('SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC');
    expect(params).toEqual([100, 200]);
  });
});

describe('getTransactionById', () => {
  it('存在/不存在', async () => {
    const db = await getDb();
    db.getFirstAsync.mockResolvedValueOnce(row({ id: 'x' }));
    expect((await getTransactionById('x'))?.id).toBe('x');
    expect(await getTransactionById('missing')).toBeUndefined();
  });
});

describe('createTransaction', () => {
  it('生成 id 并插入 8 列，返回对象', async () => {
    const db = await getDb();
    const t = await createTransaction({
      type: 'expense',
      amount: 88,
      category: 'food',
      note: '午餐',
      date: 1000,
    });
    expect(t.id).toBeTruthy();
    expect(t.type).toBe('expense');
    expect(t.amount).toBe(88);
    expect(typeof t.createdAt).toBe('number');

    const [sql, params] = db.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO transactions');
    expect(params).toHaveLength(8);
    expect(params[1]).toBe('expense');
    expect(params[2]).toBe(88);
    expect(params[3]).toBe('food');
    expect(params[4]).toBe('午餐'); // note 透传
    expect(params[5]).toBe(1000);
  });

  it('note 为空时写入 null', async () => {
    const db = await getDb();
    await createTransaction({ type: 'income', amount: 1, category: 'c', date: 1 });
    expect(db.runAsync.mock.calls[0][1][4]).toBeNull();
  });
});

describe('updateTransaction', () => {
  it('动态 SQL 拼接传入字段 + updated_at', async () => {
    const db = await getDb();
    await updateTransaction('id1', { amount: 99, note: '改' });
    const [sql, params] = db.runAsync.mock.calls[0];
    expect(sql).toBe('UPDATE transactions SET amount = ?, note = ?, updated_at = ? WHERE id = ?');
    expect(params[0]).toBe(99);
    expect(params[1]).toBe('改');
    expect(params[3]).toBe('id1');
  });

  it('无字段时仅更新 updated_at', async () => {
    const db = await getDb();
    await updateTransaction('id1', {});
    expect(db.runAsync.mock.calls[0][0]).toBe('UPDATE transactions SET updated_at = ? WHERE id = ?');
  });
});

describe('deleteTransaction', () => {
  it('按 id 删除', async () => {
    const db = await getDb();
    await deleteTransaction('id1');
    expect(db.runAsync.mock.calls[0]).toEqual(['DELETE FROM transactions WHERE id = ?', ['id1']]);
  });
});
