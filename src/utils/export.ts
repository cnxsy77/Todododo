import * as FileSystem from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import * as queries from '../database/queries';
import * as transactionQueries from '../database/transactionQueries';
import * as categoryQueries from '../database/categoryQueries';
import * as budgetQueries from '../database/budgetQueries';

export interface ExportData {
  version: string;
  exportDate: number;
  tasks: any[];
  transactions: any[];
  categories: any[];
  budgets: any[];
}

export const exportData = async (): Promise<void> => {
  try {
    const tasks = await queries.getAllTasks();
    const transactions = await transactionQueries.getAllTransactions();
    const categories = await categoryQueries.getAllCategories();
    const budgets = await budgetQueries.getAllBudgets();

    const data: ExportData = {
      version: '1.0',
      exportDate: Date.now(),
      tasks,
      transactions,
      categories,
      budgets,
    };

    const json = JSON.stringify(data, null, 2);
    const filename = `todododo_backup_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await isAvailableAsync()) {
      await shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: '导出数据',
        UTI: 'public.json',
      });
    } else {
      console.log('File saved to:', fileUri);
    }
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};
