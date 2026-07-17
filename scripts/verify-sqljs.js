// 纯 node 验证 sql.js 真实 SQLite 可用（建表/插入/查询/事务回滚）。
// 背景：jest vm sandbox 下 sql.js 的 wasm 运行时（sqlite3_open）会抛空错误，
// 无法在 jest 内跑真实 SQL；webSqlite 适配器的 jest 测试因此 mock sql.js。
// 本脚本在纯 node 下验证 sql.js 本身（适配器逻辑由 jest 覆盖，Web 端集成由浏览器验证）。
// 运行：npm run verify:web-sqlite
const initSqlJs = require('sql.js');
const path = require('path');

(async () => {
  const SQL = await initSqlJs({
    locateFile: (f) =>
      path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', f),
  });

  const db = new SQL.Database();
  db.run('CREATE TABLE t(id INTEGER, v TEXT)');
  db.run('INSERT INTO t VALUES (?, ?)', [1, 'hello']);

  const rows = db.exec('SELECT * FROM t');
  const expected = [{ columns: ['id', 'v'], values: [[1, 'hello']] }];
  if (JSON.stringify(rows) !== JSON.stringify(expected)) {
    console.error('VERIFY FAIL: 查询结果不符', JSON.stringify(rows));
    process.exit(1);
  }

  // 事务回滚：BEGIN 后插入再 ROLLBACK，行数应不变
  db.run('BEGIN');
  db.run('INSERT INTO t VALUES (?, ?)', [2, 'temp']);
  db.run('ROLLBACK');
  const count = db.exec('SELECT COUNT(*) AS c FROM t')[0].values[0][0];
  if (count !== 1) {
    console.error('VERIFY FAIL: 事务回滚后应剩 1 行，实际', count);
    process.exit(1);
  }

  console.log('VERIFY OK: sql.js 真实 SQLite 建表/插入/查询/事务回滚均正常');
  db.close();
})().catch((e) => {
  console.error('VERIFY ERR:', e.message || e);
  process.exit(1);
});
