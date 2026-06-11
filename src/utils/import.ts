import * as FileSystem from 'expo-file-system';
import type { ExportData } from './export';

export const importData = async (fileUri: string): Promise<void> => {
  try {
    const json = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const data: ExportData = JSON.parse(json);

    // 验证数据格式
    if (!data.version || !Array.isArray(data.tasks)) {
      throw new Error('无效的数据格式');
    }

    // TODO: 实现数据导入逻辑
    // 需要先清空现有数据，然后插入导入的数据
    // 这里需要调用各个 queries 的批量插入方法

    console.log('Imported:', {
      tasks: data.tasks.length,
      transactions: data.transactions?.length || 0,
      categories: data.categories?.length || 0,
      budgets: data.budgets?.length || 0,
    });

    return data;
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
};