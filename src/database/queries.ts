import { getDatabase, SQLiteDatabase } from './schema';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types';

// 辅助函数：执行查询
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

// 辅助函数：执行单个查询
const executeSingleQuery = <T>(
  tx: any,
  sql: string,
  params?: any[]
): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    tx.executeSql(
      sql,
      params,
      (_, { rows }) => {
        if (rows.length > 0) {
          resolve(rows.item(0) as T);
        } else {
          resolve(undefined);
        }
      },
      (_, error) => {
        reject(error);
        return false;
      }
    );
  });
};

// 获取所有任务
export const getAllTasks = async (): Promise<Task[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Task>(tx, 'SELECT * FROM tasks ORDER BY sort_order ASC')
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 根据计划类型获取任务
export const getTasksByPlanType = async (planType: string): Promise<Task[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Task>(
          tx,
          'SELECT * FROM tasks WHERE plan_type = ? ORDER BY sort_order ASC',
          [planType]
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 根据日期范围获取任务
export const getTasksByDateRange = async (
  startDate: number,
  endDate: number
): Promise<Task[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Task>(
          tx,
          `SELECT * FROM tasks
           WHERE start_date >= ? AND start_date <= ?
           ORDER BY plan_type, sort_order ASC`,
          [startDate, endDate]
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 根据 ID 获取任务
export const getTaskById = async (id: string): Promise<Task | undefined> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeSingleQuery<Task>(tx, 'SELECT * FROM tasks WHERE id = ?', [id])
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 创建任务
export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        // 获取当前最大 sort_order
        executeSingleQuery<{ max_order: number }>(
          tx,
          'SELECT MAX(sort_order) as max_order FROM tasks WHERE plan_type = ?',
          [input.planType]
        )
          .then((result) => {
            const sort_order = (result?.max_order || -1) + 1;

            tx.executeSql(
              `INSERT INTO tasks (id, title, description, plan_type, start_date, end_date, is_completed, sort_order, parent_task_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                input.title,
                input.description || null,
                input.planType,
                input.startDate,
                input.endDate || null,
                0,
                sort_order,
                input.parentTaskId || null,
                now,
                now,
              ],
              () => {
                resolve({
                  id,
                  title: input.title,
                  description: input.description,
                  planType: input.planType,
                  startDate: input.startDate,
                  endDate: input.endDate,
                  isCompleted: false,
                  order: sort_order,
                  parentTaskId: input.parentTaskId,
                  createdAt: now,
                  updatedAt: now,
                });
              },
              (_, error) => {
                reject(error);
                return false;
              }
            );
          })
          .catch(reject);
      },
      reject
    );
  });
};

// 更新任务
export const updateTask = async (
  id: string,
  input: UpdateTaskInput
): Promise<void> => {
  const db = await getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.planType !== undefined) {
    updates.push('plan_type = ?');
    values.push(input.planType);
  }
  if (input.startDate !== undefined) {
    updates.push('start_date = ?');
    values.push(input.startDate);
  }
  if (input.endDate !== undefined) {
    updates.push('end_date = ?');
    values.push(input.endDate);
  }
  if (input.isCompleted !== undefined) {
    updates.push('is_completed = ?');
    values.push(input.isCompleted ? 1 : 0);
  }
  if (input.order !== undefined) {
    updates.push('sort_order = ?');
    values.push(input.order);
  }
  if (input.parentTaskId !== undefined) {
    updates.push('parent_task_id = ?');
    values.push(input.parentTaskId);
  }

  updates.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
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

// 删除任务
export const deleteTask = async (id: string): Promise<void> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          'DELETE FROM tasks WHERE id = ?',
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

// 批量更新任务排序
export const updateTaskOrders = async (
  planType: string,
  taskIds: string[]
): Promise<void> => {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        const promises = taskIds.map((taskId, i) => {
          return new Promise<void>((innerResolve, innerReject) => {
            tx.executeSql(
              'UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?',
              [i, Date.now(), taskId],
              () => innerResolve(),
              (_, error) => {
                innerReject(error);
                return false;
              }
            );
          });
        });

        Promise.all(promises)
          .then(() => resolve())
          .catch(reject);
      },
      reject
    );
  });
};

// 移动任务到新的日期
export const moveTaskToDate = async (
  id: string,
  newStartDate: number,
  newEndDate?: number
): Promise<void> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          'UPDATE tasks SET start_date = ?, end_date = ?, updated_at = ? WHERE id = ?',
          [newStartDate, newEndDate || null, Date.now(), id],
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

// 获取子任务
export const getChildTasks = async (parentId: string): Promise<Task[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Task>(
          tx,
          'SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY sort_order ASC',
          [parentId]
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};

// 搜索任务
export const searchTasks = async (query: string): Promise<Task[]> => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        executeQuery<Task>(
          tx,
          'SELECT * FROM tasks WHERE title LIKE ? ORDER BY sort_order ASC',
          [`%${query}%`]
        )
          .then(resolve)
          .catch(reject);
      },
      reject
    );
  });
};
