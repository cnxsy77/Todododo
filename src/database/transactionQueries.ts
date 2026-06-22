import { getDatabase } from './schema';
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from '../types/transaction';

const mapRow = (row: any): Transaction => ({
  id: row.id,
  type: row.type,
  amount: row.amount,
  category: row.category,
  note: row.note ?? undefined,
  date: row.date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// 获取所有交易
export const getAllTransactions = async (): Promise<Transaction[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
  );
  return rows.map(mapRow);
};

// 根据类型获取交易
export const getTransactionsByType = async (type: 'income' | 'expense'): Promise<Transaction[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM transactions WHERE type = ? ORDER BY date DESC, created_at DESC',
    [type]
  );
  return rows.map(mapRow);
};

// 根据日期范围获取交易
export const getTransactionsByDateRange = async (
  startDate: number,
  endDate: number
): Promise<Transaction[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC',
    [startDate, endDate]
  );
  return rows.map(mapRow);
};

// 根据 ID 获取交易
export const getTransactionById = async (id: string): Promise<Transaction | undefined> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM transactions WHERE id = ?',
    [id]
  );
  return row ? mapRow(row) : undefined;
};

// 创建交易
export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO transactions (id, type, amount, category, note, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.type, input.amount, input.category, input.note || null, input.date, now, now]
  );

  return {
    id,
    type: input.type,
    amount: input.amount,
    category: input.category,
    note: input.note,
    date: input.date,
    createdAt: now,
    updatedAt: now,
  };
};

// 更新交易
export const updateTransaction = async (
  id: string,
  input: UpdateTransactionInput
): Promise<void> => {
  const db = await getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (input.type !== undefined) {
    updates.push('type = ?');
    values.push(input.type);
  }
  if (input.amount !== undefined) {
    updates.push('amount = ?');
    values.push(input.amount);
  }
  if (input.category !== undefined) {
    updates.push('category = ?');
    values.push(input.category);
  }
  if (input.note !== undefined) {
    updates.push('note = ?');
    values.push(input.note);
  }
  if (input.date !== undefined) {
    updates.push('date = ?');
    values.push(input.date);
  }

  updates.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  await db.runAsync(
    `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
};

// 删除交易
export const deleteTransaction = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
};
