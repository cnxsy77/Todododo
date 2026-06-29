import { getDatabase } from './schema';
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from '../types/transaction';
import { uuid } from '../utils/uuid';

const mapRow = (row: any): Budget => ({
  id: row.id,
  categoryId: row.category_id,
  amount: row.amount,
  period: row.period,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// 获取所有预算
export const getAllBudgets = async (): Promise<Budget[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM budgets ORDER BY period, created_at ASC'
  );
  return rows.map(mapRow);
};

// 根据周期获取预算
export const getBudgetsByPeriod = async (period: 'monthly' | 'yearly'): Promise<Budget[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM budgets WHERE period = ? ORDER BY created_at ASC',
    [period]
  );
  return rows.map(mapRow);
};

// 根据分类 ID 获取预算
export const getBudgetByCategoryId = async (categoryId: string): Promise<Budget | undefined> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM budgets WHERE category_id = ?',
    [categoryId]
  );
  return row ? mapRow(row) : undefined;
};

// 创建预算
export const createBudget = async (input: CreateBudgetInput): Promise<Budget> => {
  const db = await getDatabase();
  const id = `budget_${uuid()}`;
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO budgets (id, category_id, amount, period, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.categoryId, input.amount, input.period, now, now]
  );

  return {
    id,
    categoryId: input.categoryId,
    amount: input.amount,
    period: input.period,
    createdAt: now,
    updatedAt: now,
  };
};

// 更新预算
export const updateBudget = async (
  id: string,
  input: UpdateBudgetInput
): Promise<void> => {
  const db = await getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (input.amount !== undefined) {
    updates.push('amount = ?');
    values.push(input.amount);
  }
  if (input.period !== undefined) {
    updates.push('period = ?');
    values.push(input.period);
  }

  updates.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  await db.runAsync(
    `UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
};

// 删除预算
export const deleteBudget = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
};
