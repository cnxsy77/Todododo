/**
 * @jest-environment node
 *
 * webSqlite 适配器逻辑测试（mock sql.js）：
 * 验证适配器对 sql.js API 的调用映射、事务控制（BEGIN/COMMIT/ROLLBACK）、
 * 持久化调度（export + IndexedDB）。
 *
 * 说明：jest vm sandbox 下 sql.js 的 wasm 运行时（sqlite3_open）会抛空错误，
 *       无法直接跑真实 SQL，故 mock sql.js 聚焦适配器逻辑。
 *       sql.js 真实 SQL 执行由 scripts/verify-sqljs.js（纯 node）验证；
 *       Web 端端到端集成由手动浏览器验证（见 README）。
 */
import 'fake-indexeddb/auto';

// ---- 可控的 sql.js 内存 mock ----
const mockStmt: {
  bind: jest.Mock;
  step: jest.Mock;
  getAsObject: jest.Mock;
  free: jest.Mock;
} = {
  bind: jest.fn(),
  step: jest.fn(() => false),
  getAsObject: jest.fn(() => ({})),
  free: jest.fn(),
};
const mockDb: {
  exec: jest.Mock;
  run: jest.Mock;
  prepare: jest.Mock;
  getRowsModified: jest.Mock;
  export: jest.Mock;
  close: jest.Mock;
} = {
  exec: jest.fn(() => []),
  run: jest.fn(),
  prepare: jest.fn(() => mockStmt),
  getRowsModified: jest.fn(() => 1),
  export: jest.fn(() => new Uint8Array([1, 2, 3])),
  close: jest.fn(),
};

jest.mock('sql.js', () => ({
  __esModule: true,
  default: jest.fn(() =>
    Promise.resolve({ Database: jest.fn(() => mockDb) })
  ),
}));

import { openDatabaseAsync } from '../../src/database/webSqlite';

let seq = 0;
const newName = () => `test-${process.pid}-${seq++}.db`;

beforeEach(() => {
  jest.clearAllMocks();
  // 重置默认行为（clearAllMocks 清掉 implementation）
  mockDb.prepare.mockReturnValue(mockStmt);
  mockStmt.step.mockReturnValue(false);
  mockStmt.getAsObject.mockReturnValue({});
  mockDb.exec.mockReturnValue([]);
  mockDb.getRowsModified.mockReturnValue(1);
  mockDb.export.mockReturnValue(new Uint8Array([1, 2, 3]));
});

describe('webSqlite 适配器逻辑（mock sql.js）', () => {
  it('openDatabaseAsync 首次（无 IndexedDB 数据）创建空库', async () => {
    const db = await openDatabaseAsync(newName());
    expect(db).toBeDefined();
  });

  it('execAsync 调用 db.exec(source)', async () => {
    const db = await openDatabaseAsync(newName());
    await db.execAsync('CREATE TABLE t(id INTEGER)');
    expect(mockDb.exec).toHaveBeenCalledWith('CREATE TABLE t(id INTEGER)');
  });

  it('runAsync 调用 db.run(source, params) 并返回 changes/lastInsertRowId', async () => {
    const db = await openDatabaseAsync(newName());
    mockDb.getRowsModified.mockReturnValue(3);
    mockDb.exec.mockImplementation((sql: string) =>
      sql.includes('last_insert_rowid')
        ? [{ columns: ['id'], values: [[42]] }]
        : []
    );
    const r = await db.runAsync('INSERT INTO t VALUES (?)', [1]);
    expect(mockDb.run).toHaveBeenCalledWith('INSERT INTO t VALUES (?)', [1]);
    expect(r.changes).toBe(3);
    expect(r.lastInsertRowId).toBe(42);
  });

  it('runAsync 无参数时 db.run 仅传 source', async () => {
    const db = await openDatabaseAsync(newName());
    await db.runAsync('DELETE FROM t');
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM t', undefined);
  });

  it('getAllAsync 用 prepare/bind/step/getAsObject 收集多行并 free', async () => {
    const db = await openDatabaseAsync(newName());
    mockStmt.step.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValue(false);
    mockStmt.getAsObject
      .mockReturnValueOnce({ id: 1, v: 'a' })
      .mockReturnValueOnce({ id: 2, v: 'b' });
    const rows = await db.getAllAsync('SELECT * FROM t', []);
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM t');
    expect(mockStmt.bind).toHaveBeenCalledWith([]);
    expect(rows).toEqual([{ id: 1, v: 'a' }, { id: 2, v: 'b' }]);
    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('getFirstAsync 有行返回首行，无行返回 null', async () => {
    const db = await openDatabaseAsync(newName());
    mockStmt.step.mockReturnValueOnce(true);
    mockStmt.getAsObject.mockReturnValueOnce({ id: 5 });
    expect(await db.getFirstAsync('SELECT * FROM t WHERE id=?', [5])).toEqual({ id: 5 });

    mockStmt.step.mockReturnValue(false);
    expect(await db.getFirstAsync('SELECT * FROM t WHERE id=?', [99])).toBeNull();
  });

  it('withTransactionAsync 成功：BEGIN -> task -> COMMIT', async () => {
    const db = await openDatabaseAsync(newName());
    const task = jest.fn(async () => 'done');
    const r = await db.withTransactionAsync(task);
    expect(mockDb.run).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockDb.run).toHaveBeenNthCalledWith(2, 'COMMIT');
    expect(task).toHaveBeenCalled();
    expect(r).toBe('done');
  });

  it('withTransactionAsync 抛错：BEGIN -> ROLLBACK（不 COMMIT）并向上抛', async () => {
    const db = await openDatabaseAsync(newName());
    await expect(
      db.withTransactionAsync(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    const calls = mockDb.run.mock.calls.map((c) => c[0]);
    expect(calls[0]).toBe('BEGIN');
    expect(calls).toContain('ROLLBACK');
    expect(calls).not.toContain('COMMIT');
  });

  it('closeAsync 触发 flush（export + IndexedDB 写入）与 db.close', async () => {
    const db = await openDatabaseAsync(newName());
    await db.execAsync('CREATE TABLE t(id)'); // 标记 dirty + 防抖
    await db.closeAsync(); // 立即 flush（不等防抖）
    expect(mockDb.export).toHaveBeenCalled();
    expect(mockDb.close).toHaveBeenCalled();
  });
});
