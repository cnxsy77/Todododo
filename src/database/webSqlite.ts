// Web 端 SQLite 适配器（替代原 expo-sqlite.mock.js 的空降级）
//
// 用 sql.js（SQLite WASM）实现 expo-sqlite 的 SQLiteDatabase Promise API，
// 让 src/database/*Queries.ts 在 Web 端拥有真实可用的 SQLite 语义，
// 数据通过 IndexedDB 持久化。由 metro.config.js 在 Web 平台把 'expo-sqlite'
// 解析到本模块（见 resolveRequest），native 端仍用真实 expo-sqlite。
//
// 接口对齐 expo-sqlite：execAsync / runAsync / getAllAsync / getFirstAsync /
// withTransactionAsync / closeAsync。业务层（queries.ts 等）零改动。

import initSqlJs, { type SqlJsStatic, type Database, type Statement } from 'sql.js';

const IDB_NAME = 'todododo-sqlite';
const IDB_STORE = 'dbs';

// wasm 定位：Web 运行时由 expo web 静态资源根（public/）提供 /sql-wasm.wasm；
// 测试（node）环境下可通过 _setWasmLocator 注入本地文件路径。
let locateWasm = (file: string): string => '/' + file;
/** @internal 供测试注入 wasm 定位 */
export const _setWasmLocator = (fn: (file: string) => string): void => {
  locateWasm = fn;
};

// ---- IndexedDB 轻量封装（存 db.export() 的二进制）----
const idbOpen = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const idbGet = (idb: IDBDatabase, key: string): Promise<Uint8Array | undefined> =>
  new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as Uint8Array | undefined);
    req.onerror = () => reject(req.error);
  });

const idbPut = (idb: IDBDatabase, key: string, val: Uint8Array): Promise<void> =>
  new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

// ---- sql.js 单例（wasm 仅加载一次）----
let sqlPromise: Promise<SqlJsStatic> | null = null;
const getSql = (): Promise<SqlJsStatic> => {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: locateWasm });
  }
  return sqlPromise;
};

interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

// Web 端 SQLiteDatabase 实现
export class WebSQLiteDatabase {
  private db: Database;
  private idb: IDBDatabase;
  private name: string;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor(db: Database, idb: IDBDatabase, name: string) {
    this.db = db;
    this.idb = idb;
    this.name = name;
  }

  // 防抖持久化：连续写入合并为一次 export + IndexedDB 写入
  private schedulePersist(): void {
    this.dirty = true;
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.flush();
    }, 200);
  }

  private async flush(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      const bytes = this.db.export();
      await idbPut(this.idb, this.name, bytes);
    } catch (e) {
      console.warn('[webSqlite] persist failed', e);
    }
  }

  // 执行无返回语句（建表/索引/DDL），支持分号分隔多条
  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
    this.schedulePersist();
  }

  // 执行写入（INSERT/UPDATE/DELETE），返回 lastInsertRowId 与 changes
  async runAsync(source: string, params?: unknown[]): Promise<RunResult> {
    this.db.run(source, params as never);
    const changes = this.db.getRowsModified();
    let lastInsertRowId = 0;
    try {
      const res = this.db.exec('SELECT last_insert_rowid() AS id');
      if (res.length && res[0].values.length) {
        lastInsertRowId = Number(res[0].values[0][0]);
      }
    } catch {
      /* ignore */
    }
    this.schedulePersist();
    return { lastInsertRowId, changes };
  }

  // 查询多行，列名自动映射为对象
  async getAllAsync<T = Record<string, unknown>>(
    source: string,
    params?: unknown[]
  ): Promise<T[]> {
    const stmt = this.db.prepare(source);
    try {
      if (params) stmt.bind(params as never);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  // 查询首行，无结果返回 null
  async getFirstAsync<T = Record<string, unknown>>(
    source: string,
    params?: unknown[]
  ): Promise<T | null> {
    const stmt: Statement = this.db.prepare(source);
    try {
      if (params) stmt.bind(params as never);
      if (stmt.step()) {
        return stmt.getAsObject() as T;
      }
      return null;
    } finally {
      stmt.free();
    }
  }

  // 事务：BEGIN/COMMIT/ROLLBACK。task 内对同一实例的写操作均在事务内
  async withTransactionAsync<T = void>(
    task: (tx: WebSQLiteDatabase) => Promise<T>
  ): Promise<T> {
    this.db.run('BEGIN');
    try {
      const result = await task(this);
      this.db.run('COMMIT');
      this.schedulePersist();
      return result;
    } catch (e) {
      try {
        this.db.run('ROLLBACK');
      } catch {
        /* ignore rollback error */
      }
      throw e;
    }
  }

  async closeAsync(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    await this.flush();
    this.db.close();
  }
}

// 占位 class，对齐 expo-sqlite 的导出形状（schema.ts 的 type import 用）
export class SQLiteDatabase {}

// 生产入口：加载 wasm + 从 IndexedDB 恢复（或新建空库）
export const openDatabaseAsync = async (name: string): Promise<WebSQLiteDatabase> => {
  const [SQL, idb] = await Promise.all([getSql(), idbOpen()]);
  const bytes = await idbGet(idb, name);
  const db = bytes ? new SQL.Database(bytes) : new SQL.Database();
  return new WebSQLiteDatabase(db, idb, name);
};
