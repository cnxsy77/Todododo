# 测试体系：Jest 单元测试覆盖全部模块

## 目标
从零搭建 Jest + jest-expo 单元测试体系，在 `test/` 文件夹覆盖全部模块核心逻辑（utils / stores / database / hooks），补 `package.json` test 脚本，并更新功能总结文档。不含组件渲染测试与 E2E。

## 1. 依赖与配置
- `npx expo install jest-expo jest @types/jest`（expo install 自动匹配 Expo 56 版本；jest-expo 预配置 RN/TS 转换并 mock 常用 expo-* 与 react-native）。
- **`jest.config.js`**（新增）：
  - `preset: 'jest-expo'`
  - `testMatch: ['**/test/**/*.test.ts', '**/test/**/*.test.tsx']`（测试集中 `test/`）
  - `setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts']`
  - `moduleNameMapper`：源码用相对路径 import，无需别名映射。
- **`test/jest.setup.ts`**（新增）：全局 mock--
  - `@react-native-async-storage/async-storage` 用其官方 mock（themeStore 持久化）
  - `expo-notifications` 的 schedule/cancel 设为 no-op jest.fn（taskStore 调用）
  - `react-native` 的 `Appearance` mock（themeStore 跟随系统）
- **`package.json`** scripts：`test: jest`、`test:watch: jest --watch`、`test:coverage: jest --coverage`；devDependencies 加 jest/jest-expo/@types/jest。

## 2. Mock 策略
- **stores 测试**：`jest.mock('../database/queries')` 等，让 store 的 query 调用返回预设；测状态机转换（add/update/delete/reorder/move/统计聚合）。store 是纯 JS，zustand 真实跑。
- **database queries 测试**：mock `getDatabase`（来自 `./schema`）返回一个 **fake db**（`getAllAsync/getFirstAsync/runAsync/execAsync/withTransactionAsync` 为 jest.fn），按测试预设返回行 + 记录调用。验证：SQL 字符串构建、参数绑定与顺序、`mapRow` 列映射、级联（子任务/子表）逻辑。**不验证 SQL 执行语义**（依赖真机/集成；语义验证后续可升级 sql.js 内存 DB）。
- **utils export/import 测试**：mock `expo-file-system`、`expo-sharing`、`../database/queries` 的 getAll* 与清空/插入函数，验证编排逻辑与返回 `ImportSummary`。

## 3. 源码改动（为可测性）
- `src/hooks/useTasks.ts`：导出 `buildTree`（`const buildTree` → `export const buildTree`），使其可被 `test/hooks/useTasks.test.ts` 直接作为纯函数测试。无行为变化。

## 4. test/ 目录结构与用例
```
test/
  jest.setup.ts                          # 全局 mock
  utils/
    markdown.test.ts                     # stripMarkdown：标题/粗斜体/代码/链接/列表/引用/分割线/图片/混合/空文本
    uuid.test.ts                         # 格式、唯一性
    date.test.ts                         # format*、getDayStart..getYearEnd 边界、getTimeRange、addTimeUnit、isToday/Week/Month/Year、getSelectedRanges
    export-import.test.ts                # exportData JSON 结构+写文件+分享；importData 校验+清空+插入+summary
  stores/
    taskStore.test.ts                    # loadTasks(传参/无参/空range)、addTask(isInView 加入/不加入)、updateTask(更新/离开视图移除/级联子)、deleteTask(移除+子+cancel reminder)、toggleTaskCompleted(切换+级联+cancel)、reorderTasks(重排)、moveTaskToDate/WithOrder(日期+重排+离开移除)
    transactionStore.test.ts             # add/update/delete、getStatistics(收支总额/分类占比/月度趋势 重点)
    categoryStore.test.ts                # load/add/update/delete/get
    budgetStore.test.ts                  # load/add/update/delete/get
    themeStore.test.ts                   # setTheme/toggleTheme/loadTheme、computeIsDark
    viewStore.test.ts                    # setView/setCurrentDate/toggleRangeSelection(选中/取消/上限3)/clear/setRange/next/previous
  database/
    queries.test.ts                      # getTasksByPlanTypeAndRanges(SQL构建/空range)、createTask(继承父/校验两层/sort_order)、updateTask(动态SQL/null清除/级联)、deleteTask(级联)、updateTaskOrders、moveTaskToDate(级联)、mapRow
    transactionQueries.test.ts           # CRUD + getByType/getByDateRange + mapRow
    categoryQueries.test.ts              # CRUD + getByType
    budgetQueries.test.ts                # CRUD + getByPeriod/getByCategoryId
  hooks/
    useTasks.test.ts                     # buildTree：父子组装、planType 过滤、range 过滤、order 排序、空 range
```
约 15 个测试文件，覆盖任务/交易/分类/预算/主题/视图全部模块逻辑。

## 5. 文档更新 `doc/2026-07-02-项目功能与接口总结.md`
- 顶部追加 2026-07-15 更新说明（纳入测试体系 + 近期已实现：任务提醒、按视图精确加载、Markdown 富文本）。
- 2.1 补「任务提醒/通知」「按视图精确加载」；2.4 基础设施补「Markdown 富文本描述」+「测试体系」小节（Jest+jest-expo、test/ 结构、覆盖模块、`npm test` 命令）。
- 3.3 节将「任务提醒/通知」「任务附件/富文本描述」「大量任务分页/虚拟化优化」「测试体系」四项标注为已解决（✅ + 简述实现/提交）。
- 四、P3 第 10 项「测试体系」标 ✅。

## 边界
- queries 测试验证 SQL 构建与参数，不验证执行语义（文档注明）。
- buildTree 导出不影响运行时。
- jest-expo 自动 mock react-native/expo-*；expo-sqlite 经 fake db 局部 mock。
- Web 平台分支不在 jest 测（jest 跑的是 node/jsdom）。

## 验证
- `npm run type-check`
- `npm test`（全绿）
- `npm run test:coverage`（查看覆盖率，目标：utils/stores 核心逻辑高覆盖）

## 涉及文件
新增：`jest.config.js`、`test/`（jest.setup.ts + 15 个 .test.ts）、计划文档
修改：`package.json`、`src/hooks/useTasks.ts`（导出 buildTree）、`doc/2026-07-02-项目功能与接口总结.md`
