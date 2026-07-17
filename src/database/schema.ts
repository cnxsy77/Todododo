import { openDatabaseAsync, type SQLiteDatabase as ExpoSQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'todododo.db';

// 统一数据库类型：使用新版 expo-sqlite 的 Promise API
// Web 端由 metro.config.js 把 expo-sqlite 解析到 webSqlite.ts（sql.js 适配器），接口一致
export type SQLiteDatabase = ExpoSQLiteDatabase;

// 初始化数据库
export const initDatabase = async (): Promise<SQLiteDatabase> => {
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
