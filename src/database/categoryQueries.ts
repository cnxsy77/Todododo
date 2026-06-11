import { getDatabase } from './schema';
import type { Category, CreateCategoryInput } from '../types/transaction';

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

// 获取所有分类
export const getAllCategories = async (): Promise<Category[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Category>(
          tx,
          'SELECT * FROM categories ORDER BY type, created_at ASC'
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 根据类型获取分类
export const getCategoriesByType = async (type: 'income' | 'expense'): Promise<Category[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Category>(
          tx,
          'SELECT * FROM categories WHERE type = ? ORDER BY created_at ASC',
          [type]
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 根据 ID 获取分类
export const getCategoryById = async (id: string): Promise<Category | undefined> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Category>(tx, 'SELECT * FROM categories WHERE id = ?', [id])
          .then((result) => resolve(result[0]))
          .catch(reject);
      },
      reject
    );
  });
};

// 创建分类
export const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
  const db = await getDatabase();
  const id = `cat_${crypto.randomUUID()}`;
  const now = Date.now();

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `INSERT INTO categories (id, name, type, icon, color, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, input.name, input.type, input.icon, input.color, now],
          () => {
            resolve({
              id,
              name: input.name,
              type: input.type,
              icon: input.icon,
              color: input.color,
              createdAt: now,
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

// 删除分类
export const deleteCategory = async (id: string): Promise<void> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          'DELETE FROM categories WHERE id = ?',
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