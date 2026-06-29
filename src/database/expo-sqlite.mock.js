// Web 端的 expo-sqlite 模拟实现
//
// 设计意图：Web 端不使用真实 SQLite 数据库（见 app/_layout.tsx 与
// src/database/migrations.ts 中的 Web 分支），所有查询应优雅降级为空结果，
// 而不是抛错。这里实现新版 expo-sqlite 的 Promise API（openDatabaseAsync
// 及其返回对象上的方法），让 src/database/* 的查询函数在 Web 端返回空数据。

// 空结果占位：与 expo-sqlite 真实返回结构保持一致
const emptyRunResult = { lastInsertRowId: 0, changes: 0 };

const createMockDatabase = () => ({
  // 执行语句（建表、迁移等），Web 端无副作用
  execAsync: async () => {},

  // 查询多行：返回空数组
  getAllAsync: async () => [],

  // 查询单行：返回 null（表示无记录）
  getFirstAsync: async () => null,

  // 执行写入（INSERT/UPDATE/DELETE）：返回空结果占位
  runAsync: async () => emptyRunResult,

  // 事务：直接执行回调，传入同一个 mock 数据库
  withTransactionAsync: async (action) => action(createMockDatabase()),

  closeAsync: async () => {},
});

// 新版 Promise API（schema.ts 中的 initDatabase 使用）
const openDatabaseAsync = async () => createMockDatabase();

// 旧版回调 API（保留以兼容潜在引用）
const openDatabase = (dbName) => {
  console.log(`[Mock SQLite] Opening database: ${dbName}`);
  const db = createMockDatabase();
  return {
    transaction: function (callback, error, success) {
      try {
        callback({
          executeSql: function (sql, params, sqlSuccess) {
            if (sqlSuccess) sqlSuccess(null, { rows: { length: 0, item: () => undefined } });
          },
        });
        if (success) success();
      } catch (e) {
        if (error) error(e);
      }
    },
    close: function () {},
  };
};

const SQLiteDatabase = class SQLiteDatabase {};

module.exports = {
  openDatabase,
  openDatabaseAsync,
  SQLiteDatabase,
};
