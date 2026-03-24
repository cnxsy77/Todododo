import { getDatabase } from './schema';
import { Platform } from 'react-native';

// 数据库迁移版本
const CURRENT_VERSION = 1;

// 运行迁移
export const runMigrations = (): Promise<void> => {
  // Web 端不支持 expo-sqlite
  if (Platform.OS === 'web') {
    console.log('Web platform: skipping migrations');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    getDatabase()
      .then((db) => {
        db.transaction(
          (tx) => {
            // 创建迁移表
            tx.executeSql(`
              CREATE TABLE IF NOT EXISTS migrations (
                version INTEGER PRIMARY KEY
              )
            `);

            // 获取当前版本
            tx.executeSql(
              'SELECT MAX(version) as version FROM migrations',
              [],
              (_, { rows }) => {
                const currentVersion = rows.item(0)?.version || 0;

                if (currentVersion < CURRENT_VERSION) {
                  // 运行迁移脚本
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

                  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_tasks_plan_type ON tasks(plan_type)');
                  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date)');
                  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id)');

                  // 插入版本号
                  tx.executeSql('INSERT OR REPLACE INTO migrations (version) VALUES (?)', [CURRENT_VERSION]);
                }
              }
            );
          },
          (error) => {
            console.error('Migration error:', error);
            reject(error);
          },
          () => {
            console.log('Migration completed successfully');
            resolve();
          }
        );
      })
      .catch(reject);
  });
};
