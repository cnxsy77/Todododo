import { getDatabase } from './schema';
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from '../types/transaction';

// 辅助函数
const executeQuery = <T>(
  tx: any,
  sql: string,
  params?: any[]
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    tx.executeSql(
      sql,
      params,
      (_, { rows }) => {
        const result: T[] = [];
        for (let i = 0; i < rows.length; i++) {
          result.push(rows.item(i) as T);
        }
        resolve(result);
      },
      (_, error) => {
        reject(error);
        return false;
      }
    );
  });
};

// 获取所有交易
export const getAllTransactions = async (): Promise<Transaction[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Transaction>(
          tx,
          'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 根据类型获取交易
export const getTransactionsByType = async (type: 'income' | 'expense'): Promise<Transaction[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Transaction>(
          tx,
          'SELECT * FROM transactions WHERE type = ? ORDER BY date DESC, created_at DESC',
          [type]
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 根据日期范围获取交易
export const getTransactionsByDateRange = async (
  startDate: number,
  endDate: number
): Promise<Transaction[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Transaction>(
          tx,
          'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC',
          [startDate, endDate]
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 根据 ID 获取交易
export const getTransactionById = async (id: string): Promise<Transaction | undefined> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Transaction>(tx, 'SELECT * FROM transactions WHERE id = ?', [id])
          .then((result) => resolve(result[0]))
          .catch(reject);
      },
      reject
    );
  });
};

// 创建交易
export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `INSERT INTO transactions (id, type, amount, category, note, date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, input.type, input.amount, input.category, input.note || null, input.date, now, now],
          () => {
            resolve({
              id,
              type: input.type,
              amount: input.amount,
              category: input.category,
              note: input.note,
              date: input.date,
              createdAt: now,
              updatedAt: now,
            });
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      },
      reject
    );
  });
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

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`,
          values,
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      },
      reject
    );
  });
};

// 删除交易
export const deleteTransaction = async (id: string): Promise<void> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          'DELETE FROM transactions WHERE id = ?',
          [id],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      },
      reject
    );
  });
};