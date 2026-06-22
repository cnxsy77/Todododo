import { getDatabase } from './schema';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../types/transaction';

const mapRow = (row: any): Category => ({
  id: row.id,
  name: row.name,
  type: row.type,
  icon: row.icon,
  color: row.color,
  createdAt: row.created_at,
});

// 获取所有分类
export const getAllCategories = async (): Promise<Category[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM categories ORDER BY type, created_at ASC'
  );
  return rows.map(mapRow);
};

// 根据类型获取分类
export const getCategoriesByType = async (type: 'income' | 'expense'): Promise<Category[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM categories WHERE type = ? ORDER BY created_at ASC',
    [type]
  );
  return rows.map(mapRow);
};

// 根据 ID 获取分类
export const getCategoryById = async (id: string): Promise<Category | undefined> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
  return row ? mapRow(row) : undefined;
};

// 创建分类
export const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
  const db = await getDatabase();
  const id = `cat_${crypto.randomUUID()}`;
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO categories (id, name, type, icon, color, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.type, input.icon, input.color, now]
  );

  return {
    id,
    name: input.name,
    type: input.type,
    icon: input.icon,
    color: input.color,
    createdAt: now,
  };
};

// 更新分类
export const updateCategory = async (
  id: string,
  input: UpdateCategoryInput
): Promise<void> => {
  const db = await getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.icon !== undefined) {
    updates.push('icon = ?');
    values.push(input.icon);
  }
  if (input.color !== undefined) {
    updates.push('color = ?');
    values.push(input.color);
  }

  if (updates.length === 0) {
    return;
  }

  values.push(id);

  await db.runAsync(
    `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
};

// 删除分类
export const deleteCategory = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
};
