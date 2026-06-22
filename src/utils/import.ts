import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getDatabase } from '../database/schema';
import type { ExportData } from './export';

// 读取对象的字段，兼容 camelCase 与 snake_case 命名
const pick = (obj: any, camel: string, snake: string, fallback?: any) => {
  if (obj[camel] !== undefined) return obj[camel];
  if (obj[snake] !== undefined) return obj[snake];
  return fallback;
};

export interface ImportSummary {
  tasks: number;
  transactions: number;
  categories: number;
  budgets: number;
}

/**
 * 导入数据：先清空现有 tasks/transactions/categories/budgets，再批量插入。
 * @param fileUri 通过 expo-document-picker 选择的文件 URI
 */
export const importData = async (fileUri: string): Promise<ImportSummary> => {
  const json = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const data: ExportData = JSON.parse(json);

  // 验证数据格式
  if (!data.version || !Array.isArray(data.tasks)) {
    throw new Error('无效的数据格式');
  }

  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const budgets = Array.isArray(data.budgets) ? data.budgets : [];

  // Web 端使用 WebStorage 降级，无法真实写入
  if (Platform.OS === 'web') {
    console.log('Web platform: skipping actual import');
    return {
      tasks: tasks.length,
      transactions: transactions.length,
      categories: categories.length,
      budgets: budgets.length,
    };
  }

  const db = await getDatabase();
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    // 1. 清空现有数据（顺序：先删有外键依赖的 budgets）
    await db.execAsync('DELETE FROM budgets');
    await db.execAsync('DELETE FROM transactions');
    await db.execAsync('DELETE FROM tasks');
    await db.execAsync('DELETE FROM categories');

    // 2. 插入分类（其它表可能引用其 id）
    for (const c of categories) {
      await db.runAsync(
        `INSERT OR REPLACE INTO categories (id, name, type, icon, color, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          pick(c, 'id', 'id'),
          pick(c, 'name', 'name'),
          pick(c, 'type', 'type'),
          pick(c, 'icon', 'icon'),
          pick(c, 'color', 'color'),
          pick(c, 'createdAt', 'created_at', now),
        ]
      );
    }

    // 3. 插入任务
    for (const t of tasks) {
      await db.runAsync(
        `INSERT OR REPLACE INTO tasks
         (id, title, description, plan_type, start_date, end_date, is_completed, sort_order, parent_task_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pick(t, 'id', 'id'),
          pick(t, 'title', 'title'),
          pick(t, 'description', 'description', null),
          pick(t, 'planType', 'plan_type', 'daily'),
          pick(t, 'startDate', 'start_date', now),
          pick(t, 'endDate', 'end_date', null),
          pick(t, 'isCompleted', 'is_completed', 0) ? 1 : 0,
          pick(t, 'order', 'sort_order', 0),
          pick(t, 'parentTaskId', 'parent_task_id', null),
          pick(t, 'createdAt', 'created_at', now),
          pick(t, 'updatedAt', 'updated_at', now),
        ]
      );
    }

    // 4. 插入交易
    for (const t of transactions) {
      await db.runAsync(
        `INSERT OR REPLACE INTO transactions
         (id, type, amount, category, note, date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pick(t, 'id', 'id'),
          pick(t, 'type', 'type'),
          pick(t, 'amount', 'amount'),
          pick(t, 'category', 'category'),
          pick(t, 'note', 'note', null),
          pick(t, 'date', 'date', now),
          pick(t, 'createdAt', 'created_at', now),
          pick(t, 'updatedAt', 'updated_at', now),
        ]
      );
    }

    // 5. 插入预算
    for (const b of budgets) {
      await db.runAsync(
        `INSERT OR REPLACE INTO budgets
         (id, category_id, amount, period, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          pick(b, 'id', 'id'),
          pick(b, 'categoryId', 'category_id'),
          pick(b, 'amount', 'amount'),
          pick(b, 'period', 'period', 'monthly'),
          pick(b, 'createdAt', 'created_at', now),
          pick(b, 'updatedAt', 'updated_at', now),
        ]
      );
    }
  });

  const summary: ImportSummary = {
    tasks: tasks.length,
    transactions: transactions.length,
    categories: categories.length,
    budgets: budgets.length,
  };
  console.log('Imported:', summary);
  return summary;
};
