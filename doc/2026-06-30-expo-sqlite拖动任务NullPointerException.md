# expo-sqlite 拖动任务/创建任务报 NullPointerException

> 日期：2026-06-30
> 环境：expo-sqlite 56.0.5 / expo 56.0.12 / react-native 0.85.3 / Android 模拟器（API 34 与 API 37 均复现）
> 状态：已修复

## 一、现象

App 运行一段时间后，数据库写操作（创建任务、拖动任务排序等）必然崩溃，报：

```
Error: Call to function 'NativeDatabase.execAsync' has been rejected.
→ Caused by: java.lang.NullPointerException: java.lang.NullPointerException
```

特征：

- 崩在该次操作的**第一个原生调用**（`execAsync` 或 `prepareAsync`）。
- 不是固定第几次——单例模式下通常前 2~3 次正常、之后必崩；冷启动可恢复，但运行中必然复发。
- 创建任务、拖动排序都会触发，与具体 SQL 无关。
- API 34（Android 14）和 API 37（Android 16）两台模拟器都复现。

## 二、根因

开发模式下 `openDatabaseAsync` 默认会调用 `registerDatabaseForDevToolsAsync(database)`（除非显式传 `useNewConnection: true`）。该 dev tools 注册干扰了 expo-sqlite 的 SharedObject 生命周期，导致 native sqlite3 句柄被提前 release。

native 层的关键缺陷链：

1. `NativeDatabaseBinding.close()` 调用 `mHybridData.resetNative()` 释放 native 指针，但**不更新 `NativeDatabase.isClosed` 标志**。
2. SharedObject 被 release 时触发 `NativeDatabase.sharedObjectDidRelease()` → `ref.close()` → `resetNative()`。
3. 之后调用 `exec(database, source)`：先 `maybeThrowForClosedDatabase`（检查 `isClosed`，仍为 false，不拦截），再用**已 reset 的指针**调用 `database.ref.sqlite3_exec(source)` → **NullPointerException**。

这解释了所有现象：运行一段时间后 SharedObject 被 release → 句柄 reset → 后续操作的第一个原生调用必崩；冷启动重新 open 恢复。

### 关键源码位置

| 文件 | 行 | 内容 |
|------|----|------|
| `node_modules/expo-sqlite/build/SQLiteDatabase.js` | ~442 | `openDatabaseAsync` 默认调 `registerDatabaseForDevToolsAsync`（`useNewConnection !== true` 时） |
| `node_modules/expo-sqlite/android/.../NativeDatabaseBinding.kt` | ~23 | `close()` 只 `resetNative()`，不更新 `isClosed` |
| `node_modules/expo-sqlite/android/.../NativeDatabase.kt` | — | `sharedObjectDidRelease()` → `this.ref.close()` |
| `node_modules/expo-sqlite/android/.../SQLiteModule.kt` | ~367 | `exec()` 的 `maybeThrowForClosedDatabase` 检查 `isClosed`（已失效） |

## 三、修复

`src/database/schema.ts` 的 `initDatabase` 显式传 `useNewConnection: true`，跳过 dev tools 注册：

```ts
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
```

本项目 `getDatabase` 是单例（只 open 一次），`useNewConnection: true` 不会带来额外连接开销，无副作用。已验证：创建任务、拖动排序、切换视图均不再崩溃。

## 四、排查过程（systematic-debugging）

此根因难以一次猜中，用证据依次排除多个错误假设：

| # | 假设 | 结论 | 依据 |
|---|------|------|------|
| 1 | 应用代码/SQL/事务逻辑错误 | ❌ 排除 | createTask 与前几次操作都成功，SQL/参数/事务逻辑无误 |
| 2 | 16KB 页兼容 | ❌ 排除 | APK 内 `libexpo-sqlite.so` 的 LOAD 段对齐是 `0x4000`（16KB），兼容 |
| 3 | API 37 模拟器/JIT 问题 | ❌ 排除 | API 34 模拟器同样崩 |
| 4 | statement 资源泄漏 | ❌ 排除 | `runAsync`/`getFirstAsync` 的 `finally` 都正确 `finalizeAsync` |
| 5 | 数据库文件损坏 | ❌ 排除 | `PRAGMA integrity_check` = `ok`，文件正常 |
| 6 | 单例对象被 GC | ❌ 排除 | 每次 open 新连接反而**更早崩**——反向指向 dev tools 注册干扰 |

**关键转折**：实验 6「每次重新 open 新连接」本意是验证 GC 假设，结果反而更早崩溃。这个反直觉结果把怀疑指向 `openDatabaseAsync` 内部的 `registerDatabaseForDevToolsAsync`，进而发现 `useNewConnection` 选项正好绕开它，最终定位并修复。

### 诊断手段备忘

- 分步日志：在 `createTask`/`updateTaskOrders` 内逐步 `console.log`，确认崩在事务第一步 `execAsync('BEGIN')` 还是循环内。
- 去事务对比：去掉 `withTransactionAsync` 改纯 `runAsync`，错误从 `execAsync` 变 `prepareAsync` 但仍是同一 NPE → 证明与事务/SQL 无关，是句柄损坏。
- 换设备：API 34 复现，排除模拟器版本因素。
- 检查 .so 对齐：`unzip` APK 后 `readelf -lW libexpo-sqlite.so | grep LOAD`，排除 16KB 页。
- 检查 DB 文件：`adb shell run-as com.todododo.app cat .../todododo.db` pull 出来 `sqlite3` 检查。

## 五、相关文件

- `src/database/schema.ts` — 修复点（`initDatabase` 加 `useNewConnection: true`）
- `src/database/queries.ts` — createTask / updateTaskOrders（曾用于诊断，已清理）
- `src/screens/TaskDetailScreen/index.tsx` — handleSave 的 catch 保留 `console.error` 便于今后排查
