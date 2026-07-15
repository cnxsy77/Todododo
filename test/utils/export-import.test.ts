import { Platform } from 'react-native';

// ---- mock 依赖（工厂内定义，不引用外部变量，规避 jest hoisting 限制）----
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-docs/',
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/database/queries', () => ({
  getAllTasks: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../src/database/transactionQueries', () => ({
  getAllTransactions: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../src/database/categoryQueries', () => ({
  getAllCategories: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../src/database/budgetQueries', () => ({
  getAllBudgets: jest.fn(() => Promise.resolve([])),
}));

// schema 工厂内构造 fakeDb 并暴露，使测试可取到同一实例
jest.mock('../../src/database/schema', () => {
  const fakeDb = {
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve()),
    withTransactionAsync: jest.fn((cb: any) => cb()),
  };
  return { getDatabase: jest.fn(() => Promise.resolve(fakeDb)) };
});

import { exportData } from '../../src/utils/export';
import { importData } from '../../src/utils/import';
import * as queries from '../../src/database/queries';
import * as txnQueries from '../../src/database/transactionQueries';
import * as catQueries from '../../src/database/categoryQueries';
import * as budgetQueries from '../../src/database/budgetQueries';
import { getDatabase } from '../../src/database/schema';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const getFakeDb = async () => {
  const db = await getDatabase();
  return db as unknown as {
    execAsync: jest.Mock;
    runAsync: jest.Mock;
    withTransactionAsync: jest.Mock;
  };
};

// 源码在导出/导入流程中有预期的 console.log/error，测试时静音以保持输出整洁
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

describe('exportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queries.getAllTasks as jest.Mock).mockResolvedValue([{ id: 't1' }]);
    (txnQueries.getAllTransactions as jest.Mock).mockResolvedValue([{ id: 'txn1' }]);
    (catQueries.getAllCategories as jest.Mock).mockResolvedValue([{ id: 'c1' }]);
    (budgetQueries.getAllBudgets as jest.Mock).mockResolvedValue([{ id: 'b1' }]);
  });

  it('聚合四表数据写入文件并按日期命名', async () => {
    await exportData();

    expect(queries.getAllTasks).toHaveBeenCalled();
    expect(txnQueries.getAllTransactions).toHaveBeenCalled();
    expect(catQueries.getAllCategories).toHaveBeenCalled();
    expect(budgetQueries.getAllBudgets).toHaveBeenCalled();

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);
    const [fileUri, json] = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    expect(fileUri).toMatch(/^file:\/\/\/mock-docs\/todododo_backup_\d{4}-\d{2}-\d{2}\.json$/);

    const parsed = JSON.parse(json);
    expect(parsed).toMatchObject({
      version: '1.0',
      tasks: [{ id: 't1' }],
      transactions: [{ id: 'txn1' }],
      categories: [{ id: 'c1' }],
      budgets: [{ id: 'b1' }],
    });
    expect(typeof parsed.exportDate).toBe('number');
  });

  it('分享不可用时仅写文件不调用 shareAsync', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
    await exportData();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('分享可用时调用 shareAsync', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    await exportData();
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
    const [fileUri] = (Sharing.shareAsync as jest.Mock).mock.calls[0];
    expect(fileUri).toMatch(/\.json$/);
  });

  it('读取数据抛错时向上抛出', async () => {
    (queries.getAllTasks as jest.Mock).mockRejectedValue(new Error('db down'));
    await expect(exportData).rejects.toThrow('db down');
  });
});

describe('importData', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios'; // 走 db 分支而非 web 降级
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  const buildJson = (overrides: Record<string, any> = {}) =>
    JSON.stringify({
      version: '1.0',
      tasks: [{ id: 't1', title: '任务' }],
      transactions: [{ id: 'txn1', type: 'expense', amount: 10, category: 'c1', date: 1000 }],
      categories: [{ id: 'c1', name: '餐饮', type: 'expense', icon: 'i', color: '#fff' }],
      budgets: [{ id: 'b1', categoryId: 'c1', amount: 1000, period: 'monthly' }],
      ...overrides,
    });

  it('校验失败（无 version）抛错', async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(JSON.stringify({ tasks: [] }));
    await expect(importData('file:///x.json')).rejects.toThrow('无效的数据格式');
  });

  it('校验失败（tasks 非数组）抛错', async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({ version: '1.0', tasks: 'nope' })
    );
    await expect(importData('file:///x.json')).rejects.toThrow('无效的数据格式');
  });

  it('清空四表 + 按序插入，返回 summary', async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(buildJson());

    const summary = await importData('file:///x.json');
    const db = await getFakeDb();

    // 4 张表各 DELETE 一次
    expect(db.execAsync).toHaveBeenCalledTimes(4);
    expect(db.execAsync.mock.calls.map((c) => c[0])).toEqual([
      'DELETE FROM budgets',
      'DELETE FROM transactions',
      'DELETE FROM tasks',
      'DELETE FROM categories',
    ]);

    // 1 分类 + 1 任务 + 1 交易 + 1 预算 = 4 次插入
    expect(db.runAsync).toHaveBeenCalledTimes(4);
    expect(db.runAsync.mock.calls[0][0]).toContain('INSERT OR REPLACE INTO categories');
    expect(db.runAsync.mock.calls[1][0]).toContain('INSERT OR REPLACE INTO tasks');
    expect(db.runAsync.mock.calls[2][0]).toContain('INSERT OR REPLACE INTO transactions');
    expect(db.runAsync.mock.calls[3][0]).toContain('INSERT OR REPLACE INTO budgets');

    // 插入在单个事务中执行
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);

    expect(summary).toEqual({ tasks: 1, transactions: 1, categories: 1, budgets: 1 });
  });

  it('空数组各表仍正常返回 0', async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
      buildJson({ tasks: [], transactions: [], categories: [], budgets: [] })
    );
    const summary = await importData('file:///x.json');
    expect(summary).toEqual({ tasks: 0, transactions: 0, categories: 0, budgets: 0 });
    const db = await getFakeDb();
    expect(db.runAsync).toHaveBeenCalledTimes(0);
  });

  it('Web 平台跳过实际写入，仅返回数量', async () => {
    Platform.OS = 'web';
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(buildJson());
    const summary = await importData('file:///x.json');
    expect(summary).toEqual({ tasks: 1, transactions: 1, categories: 1, budgets: 1 });
    expect(getDatabase).not.toHaveBeenCalled();
  });
});
