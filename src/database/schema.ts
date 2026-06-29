import { Platform } from 'react-native';
import { openDatabaseAsync, type SQLiteDatabase as ExpoSQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'todododo.db';

// 统一数据库类型：使用新版 expo-sqlite 的 Promise API
export type SQLiteDatabase = ExpoSQLiteDatabase;

// Web 端 expo-sqlite 自带 WebStorage 降级（返回空结果），无需额外 mock。
// 初始化数据库
export const initDatabase = async (): Promise<SQLiteDatabase> => {
  if (Platform.OS === 'web') {
    console.log('Web platform: using web storage fallback');
  }
  // useNewConnection:true 跳过 registerDatabaseForDevToolsAsync。
  // 开发模式下 dev tools 注册会干扰 expo-sqlite 的 SharedObject 生命周期，
  // 导致 native sqlite3 句柄被提前 release（resetNative），后续操作抛
  // NullPointerException（NativeDatabase.execAsync/prepareAsync has been rejected）。
  // 单例模式下只 open 一次，useNewConnection 无副作用。
  return openDatabaseAsync(DB_NAME, { useNewConnection: true });
};

// 获取数据库实例（单例模式）
let dbInstance: SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLiteDatabase> => {
  if (!dbInstance) {
    dbInstance = await initDatabase();
  }
  return dbInstance;
};
