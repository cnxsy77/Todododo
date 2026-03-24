import { Platform } from 'react-native';

export const DB_NAME = 'todododo.db';

// 模拟数据库对象用于 Web 端
const mockDatabase = {
  transaction: (callback: (tx: any) => void, error?: () => void, success?: () => void) => {
    console.log('[Web] Mock transaction');
    const tx = {
      executeSql: (sql: string, params?: any[], sqlSuccess?: () => void, sqlError?: () => void) => {
        console.log('[Web] Mock executeSql:', sql);
        const result = { rows: { length: 0, item: () => undefined } };
        if (sqlSuccess) sqlSuccess(null, result);
      }
    };
    try {
      callback(tx);
      if (success) success();
    } catch (e) {
      console.error('[Web] Mock transaction error:', e);
      if (error) error();
    }
  },
  close: () => {
    console.log('[Web] Mock database closed');
  }
};

// 类型定义
export type SQLiteDatabase = typeof mockDatabase;

// 初始化数据库
export const initDatabase = (): Promise<SQLiteDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      // Web 端使用模拟数据库
      if (Platform.OS === 'web') {
        console.log('Web platform: using mock database');
        resolve(mockDatabase);
        return;
      }

      // 移动端使用原生 expo-sqlite
      const SQLite = require('expo-sqlite');
      const db = SQLite.openDatabase(DB_NAME);
      resolve(db);
    } catch (error) {
      reject(error);
    }
  });
};

// 获取数据库实例（单例模式）
let dbInstance: SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLiteDatabase> => {
  if (!dbInstance) {
    dbInstance = await initDatabase();
  }
  return dbInstance;
};
