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
  getAllCategories,
  getCategoriesByType,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../src/database/categoryQueries';
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
  id: 'cat_1',
  name: '餐饮',
  type: 'expense',
  icon: '🍔',
  color: '#ff0000',
  created_at: 900,
  ...overrides,
});

beforeEach(async () => {
  jest.clearAllMocks();
  const db = await getDb();
  db.getAllAsync.mockResolvedValue([]);
  db.getFirstAsync.mockResolvedValue(null);
});

describe('categoryQueries mapRow', () => {
  it('列映射', async () => {
    const db = await getDb();
    db.getAllAsync.mockResolvedValue([row()]);
    const [c] = await getAllCategories();
    expect(c).toEqual({ id: 'cat_1', name: '餐饮', type: 'expense', icon: '🍔', color: '#ff0000', createdAt: 900 });
  });
});

describe('getAllCategories', () => {
  it('按 type, created_at 排序', async () => {
    const db = await getDb();
    await getAllCategories();
    expect(db.getAllAsync.mock.calls[0][0]).toBe('SELECT * FROM categories ORDER BY type, created_at ASC');
  });
});

describe('getCategoriesByType', () => {
  it('WHERE type = ?', async () => {
    const db = await getDb();
    await getCategoriesByType('income');
    const [sql, params] = db.getAllAsync.mock.calls[0];
    expect(sql).toBe('SELECT * FROM categories WHERE type = ? ORDER BY created_at ASC');
    expect(params).toEqual(['income']);
  });
});

describe('getCategoryById', () => {
  it('存在/不存在', async () => {
    const db = await getDb();
    db.getFirstAsync.mockResolvedValueOnce(row({ id: 'x' }));
    expect((await getCategoryById('x'))?.id).toBe('x');
    expect(await getCategoryById('missing')).toBeUndefined();
  });
});

describe('createCategory', () => {
  it('id 以 cat_ 前缀，插入 6 列，返回对象', async () => {
    const db = await getDb();
    const c = await createCategory({ name: '交通', type: 'expense', icon: '🚗', color: '#00f' });
    expect(c.id).toMatch(/^cat_/);
    expect(c.name).toBe('交通');
    expect(c.type).toBe('expense');

    const [sql, params] = db.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO categories');
    expect(params).toHaveLength(6);
    expect(params[0]).toMatch(/^cat_/);
    expect(params[1]).toBe('交通');
    expect(params[2]).toBe('expense');
    expect(params[3]).toBe('🚗');
    expect(params[4]).toBe('#00f');
  });
});

describe('updateCategory', () => {
  it('动态 SQL 拼接传入字段（无 updated_at 列）', async () => {
    const db = await getDb();
    await updateCategory('cat_1', { name: '新名', color: '#000' });
    const [sql, params] = db.runAsync.mock.calls[0];
    expect(sql).toBe('UPDATE categories SET name = ?, color = ? WHERE id = ?');
    expect(params).toEqual(['新名', '#000', 'cat_1']);
  });

  it('无字段时直接返回不查库', async () => {
    const db = await getDb();
    await updateCategory('cat_1', {});
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});

describe('deleteCategory', () => {
  it('按 id 删除', async () => {
    const db = await getDb();
    await deleteCategory('cat_1');
    expect(db.runAsync.mock.calls[0]).toEqual(['DELETE FROM categories WHERE id = ?', ['cat_1']]);
  });
});
