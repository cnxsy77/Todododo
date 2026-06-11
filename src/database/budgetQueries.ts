import { getDatabase } from './schema';
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from '../types/transaction';

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

// 获取所有预算
export const getAllBudgets = async (): Promise<Budget[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Budget>(
          tx,
          'SELECT * FROM budgets ORDER BY period, created_at ASC'
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 根据周期获取预算
export const getBudgetsByPeriod = async (period: 'monthly' | 'yearly'): Promise<Budget[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Budget>(
          tx,
          'SELECT * FROM budgets WHERE period = ? ORDER BY created_at ASC',
          [period]
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 根据分类 ID 获取预算
export const getBudgetByCategoryId = async (categoryId: string): Promise<Budget | undefined> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Budget>(tx, 'SELECT * FROM budgets WHERE category_id = ?', [categoryId])
          .then((result) => resolve(result[0]))
          .catch(reject);
      },
      reject
    );
  });
};

// 创建预算
export const createBudget = async (input: CreateBudgetInput): Promise<Budget> => {
  const db = await getDatabase();
  const id = `budget_${crypto.randomUUID()}`;
  const now = Date.now();

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `INSERT INTO budgets (id, category_id, amount, period, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, input.categoryId, input.amount, input.period, now, now],
          () => {
            resolve({
              id,
              categoryId: input.categoryId,
              amount: input.amount,
              period: input.period,
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

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`,
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

// 删除预算
export const deleteBudget = async (id: string): Promise<void> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          'DELETE FROM budgets WHERE id = ?',
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