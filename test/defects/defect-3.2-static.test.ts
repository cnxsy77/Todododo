/// <reference types="node" />
// 3.2 缺陷探测（静态层：功能缺失 / 平台降级，非运行时逻辑）
// 缺陷3为“探测器”：通过 = 缺陷仍存在。
// 缺陷4已修复：探测语义翻转，通过 = 缺陷已消除（若回退则会变红）。
// 用 fs 读取源码 / 依赖清单做字符串断言，不依赖运行时数据库。

import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../..');
const readSrc = (rel: string) => fs.readFileSync(path.resolve(root, rel), 'utf8');

// -----------------------------------------------------------------------
// 缺陷3：统计页无图表
// 文档 3.2：“StatisticsScreen 仅文本/列表展示，未引入图表库。占比/趋势可视化缺失。”
// 探测点：package.json 无图表库依赖；StatisticsScreen 未 import 图表组件。
// 注：StatisticsScreen 用 View 手绘了简易进度条/条形（progressBar/dailyChart/bar），
//    但未引入正式图表库（饼图/折线图等仍缺失）。
// -----------------------------------------------------------------------
describe('缺陷3探测：统计页未引入图表库（期望缺陷仍存在）', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const chartLibs = [
    'react-native-chart-kit',
    'react-native-gifted-charts',
    'victory-native',
    'react-native-svg',
    'recharts',
    'd3',
    'chart.js',
    '@react-native-community/art',
  ];

  it('package.json 未声明任何图表库依赖', () => {
    const present = chartLibs.filter((lib) => lib in deps);
    expect(present).toEqual([]); // 为空 = 无图表库 = 缺陷仍存在
  });

  it('StatisticsScreen 未 import 任何图表组件', () => {
    const src = readSrc('src/screens/StatisticsScreen/index.tsx');
    // 不应出现图表库 import
    expect(src).not.toMatch(/from\s+['"](react-native-chart-kit|react-native-gifted-charts|victory-native|react-native-svg|recharts|d3|chart\.js)['"]/);
    // 仅用 View/Text 手绘，无 <Pie>/<LineChart>/<BarChart> 等图表组件
    expect(src).not.toMatch(/<(Pie|PieChart|LineChart|BarChart|AreaChart|VictoryChart|Chart)\b/);
  });
});

// -----------------------------------------------------------------------
// 缺陷4：Web 端数据库不可用 —— 已修复
// 修复方式：用 sql.js WASM 适配器（src/database/webSqlite.ts）替代返回空的 mock，
//           metro.config.js 在 Web 平台把 expo-sqlite 指向该适配器，
//           数据持久化到 IndexedDB；移除 _layout/migrations/schema 的 Web 跳过守卫。
// 探测语义翻转：通过 = 缺陷已消除。若有人回退守卫或恢复 mock，对应断言变红。
// 注：import.ts 的 Web 守卫保留，因其受 expo-file-system legacy（无 readAsStringAsync）
//    限制，属独立 file-system 问题，非数据库缺陷。
// -----------------------------------------------------------------------
describe('缺陷4探测：Web 端数据库已可用（期望缺陷已消除）', () => {
  it('schema.ts 不再含 Web 跳过守卫', () => {
    const src = readSrc('src/database/schema.ts');
    expect(src).not.toMatch(/Platform\.OS\s*===\s*['"]web['"]/);
  });

  it('migrations.ts 不再含 Web 跳过守卫，Web 也执行真实迁移', () => {
    const src = readSrc('src/database/migrations.ts');
    expect(src).not.toMatch(/Platform\.OS\s*===\s*['"]web['"]/);
  });

  it('app/_layout.tsx 不再因 Web 跳过数据库初始化', () => {
    const src = readSrc('app/_layout.tsx');
    expect(src).not.toMatch(/Platform\.OS\s*===\s*['"]web['"]/);
  });

  it('存在 Web 端真实 SQLite 适配器 webSqlite.ts（基于 sql.js）', () => {
    const src = readSrc('src/database/webSqlite.ts');
    expect(src).toMatch(/from\s+['"]sql\.js['"]/);
    expect(src).toMatch(/openDatabaseAsync/);
    expect(src).toMatch(/withTransactionAsync/);
    expect(src).toMatch(/getAllAsync/);
    expect(src).toMatch(/IndexedDB|idbPut/); // 持久化
  });

  it('expo-sqlite.mock.js（返回空的降级 mock）已删除', () => {
    const p = path.resolve(root, 'src/database/expo-sqlite.mock.js');
    expect(fs.existsSync(p)).toBe(false);
  });

  it('metro.config.js 在 Web 平台指向 webSqlite 适配器，不再指向 mock', () => {
    const src = readSrc('metro.config.js');
    expect(src).toMatch(/webSqlite\.ts/);
    expect(src).not.toMatch(/expo-sqlite\.mock\.js/);
  });
});
