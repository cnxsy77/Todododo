import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'todododo.db';

// 初始化数据库
export const initDatabase = (): Promise<SQLite.SQLiteDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      const db = SQLite.openDatabase(DB_NAME);

      db.transaction(
        (tx) => {
          // 创建任务表
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS tasks (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              description TEXT,
              plan_type TEXT NOT NULL CHECK(plan_type IN ('daily', 'weekly', 'monthly', 'yearly')),
              start_date INTEGER NOT NULL,
              end_date INTEGER,
              is_completed INTEGER DEFAULT 0,
              sort_order INTEGER NOT NULL,
              parent_task_id TEXT REFERENCES tasks(id),
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL
            )
          `);

          // 创建索引
          tx.executeSql('CREATE INDEX IF NOT EXISTS idx_tasks_plan_type ON tasks(plan_type)');
          tx.executeSql('CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date)');
          tx.executeSql('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id)');
        },
        (error) => {
          reject(error);
        },
        () => {
          resolve(db);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

// 获取数据库实例（单例模式）
let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbInstance) {
    dbInstance = await initDatabase();
  }
  return dbInstance;
};
