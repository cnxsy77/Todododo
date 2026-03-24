// Web 端的 expo-sqlite 模拟实现

const openDatabase = (dbName) => {
  console.log(`[Mock SQLite] Opening database: ${dbName}`);

  return {
    transaction: function(callback, error, success) {
      console.log('[Mock SQLite] Transaction started');
      const tx = {
        executeSql: function(sql, params, sqlSuccess, sqlError) {
          console.log('[Mock SQLite] executeSql:', sql, params);
          const result = { rows: { length: 0, item: () => undefined } };
          if (sqlSuccess) sqlSuccess(null, result);
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
    close: function() {
      console.log('[Mock SQLite] Database closed');
    }
  };
};

const SQLiteDatabase = class SQLiteDatabase {};

module.exports = {
  openDatabase,
  SQLiteDatabase,
};
