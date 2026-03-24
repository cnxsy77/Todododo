// Web 端的 expo-sqlite 模拟实现

export const openDatabase = (dbName: string) => {
  console.log(`[Mock SQLite] Opening database: ${dbName}`);

  return {
    transaction: (callback: (tx: any) => void, error?: () => void, success?: () => void) => {
      console.log('[Mock SQLite] Transaction started');
      const tx = {
        executeSql: (sql: string, params?: any[], success?: () => void, error?: () => void) => {
          console.log('[Mock SQLite] executeSql:', sql, params);
          if (success) success();
        }
      };
      try {
        callback(tx);
        if (success) success();
      } catch (e) {
        console.error('[Mock SQLite] Transaction error:', e);
        if (error) error();
      }
    },
    close: () => {
      console.log('[Mock SQLite] Database closed');
    }
  };
};

export const SQLiteDatabase = class SQLiteDatabase {};
