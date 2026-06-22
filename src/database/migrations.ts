import { getDatabase } from './schema';
import { Platform } from 'react-native';

// 数据库迁移版本
const CURRENT_VERSION = 2;

interface MigrationVersion {
  version: number;
}

// 运行迁移
export const runMigrations = async (): Promise<void> => {
  // Web 端 expo-sqlite 使用 WebStorage 降级（返回空结果），跳过真实迁移
  if (Platform.OS === 'web') {
    console.log('Web platform: skipping migrations');
    return;
  }

  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // 创建迁移表
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY
      )
    `);

    // 获取当前版本
    const row = await db.getFirstAsync<MigrationVersion>(
      'SELECT MAX(version) as version FROM migrations'
    );
    const currentVersion = row?.version ?? 0;

    if (currentVersion < CURRENT_VERSION) {
      // 版本 1: 创建 tasks 表
      if (currentVersion < 1) {
        await db.execAsync(`
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

        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_plan_type ON tasks(plan_type)');
        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date)');
        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id)');
      }

      // 版本 2: 创建货币功能相关表
      if (currentVersion < 2) {
        // 交易记录表
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            note TEXT,
            date INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          )
        `);

        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');
        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)');

        // 分类表
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            icon TEXT,
            color TEXT,
            created_at INTEGER NOT NULL
          )
        `);

        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type)');

        // 预算表
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL,
            amount REAL NOT NULL,
            period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')),
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
          )
        `);

        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id)');
        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period)');

        // 插入默认分类
        const now = Date.now();
        const defaultCategories = [
          // 收入分类
          { id: 'cat_income_1', name: '工资', type: 'income', icon: '💰', color: '#4CAF50' },
          { id: 'cat_income_2', name: '投资', type: 'income', icon: '📈', color: '#8BC34A' },
          { id: 'cat_income_3', name: '兼职', type: 'income', icon: '💼', color: '#CDDC39' },
          { id: 'cat_income_4', name: '红包', type: 'income', icon: '🎁', color: '#FFEB3B' },
          { id: 'cat_income_5', name: '其他收入', type: 'income', icon: '💵', color: '#FFC107' },
          // 支出分类
          { id: 'cat_expense_1', name: '餐饮', type: 'expense', icon: '🍜', color: '#F44336' },
          { id: 'cat_expense_2', name: '交通', type: 'expense', icon: '🚗', color: '#E91E63' },
          { id: 'cat_expense_3', name: '购物', type: 'expense', icon: '🛒', color: '#9C27B0' },
          { id: 'cat_expense_4', name: '娱乐', type: 'expense', icon: '🎮', color: '#673AB7' },
          { id: 'cat_expense_5', name: '医疗', type: 'expense', icon: '💊', color: '#3F51B5' },
          { id: 'cat_expense_6', name: '教育', type: 'expense', icon: '📚', color: '#2196F3' },
          { id: 'cat_expense_7', name: '居住', type: 'expense', icon: '🏠', color: '#03A9F4' },
          { id: 'cat_expense_8', name: '通讯', type: 'expense', icon: '📱', color: '#00BCD4' },
          { id: 'cat_expense_9', name: '其他支出', type: 'expense', icon: '📦', color: '#009688' },
        ];

        for (const cat of defaultCategories) {
          await db.runAsync(
            'INSERT OR IGNORE INTO categories (id, name, type, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [cat.id, cat.name, cat.type, cat.icon, cat.color, now]
          );
        }
      }

      // 插入版本号
      await db.runAsync(
        'INSERT OR REPLACE INTO migrations (version) VALUES (?)',
        [CURRENT_VERSION]
      );
    }
  });

  console.log('Migration completed successfully');
};
