# Todododo 功能总结

> 本文档基于对项目源码的逐文件遍历与功能点验证生成，记录当前已实现的功能及其实际完成度。
> 生成日期：2026-06-22

## 一、项目概览

Todododo 是一个基于 **React Native + Expo** 的跨平台应用，集**任务管理**与**货币记账**于一体，并配有设置与数据导入导出能力。

### 技术栈

| 维度 | 技术 |
| --- | --- |
| 框架 | React Native 0.85 + Expo 56 |
| 路由 | expo-router（Tabs + Stack） |
| 语言 | TypeScript（strict 模式） |
| 状态管理 | Zustand |
| 本地数据库 | expo-sqlite |
| 动画 / 手势 | react-native-reanimated、react-native-gesture-handler |
| 拖拽列表 | react-native-draggable-flatlist |
| 日期处理 | date-fns |
| 文件 / 分享 | expo-file-system、expo-sharing、expo-document-picker |
| 持久化 | @react-native-async-storage/async-storage |

### 导航架构

- 底部 3 个 Tab：📋 任务、💰 货币、⚙️ 设置
- Stack 详情路由：`task-detail`、`transaction-detail`、`statistics`
- 路由文件与对应 Screen 组件已全部正确连接

## 二、任务管理模块

### 数据层
- **数据库表 `tasks`**：含 `plan_type` CHECK 约束（daily/weekly/monthly/yearly）、`sort_order`、`parent_task_id` 自引用、时间戳字段。
- **版本化迁移**：v1 建 `tasks` 表与索引，v2 建货币相关表并插入默认分类。
- **任务 CRUD（`queries.ts`）**：`getAllTasks`、`getTasksByPlanType`、`getTasksByDateRange`、`getTaskById`、`createTask`（自动计算 sort_order）、`updateTask`（动态拼接 SET）、`deleteTask`、`updateTaskOrders`、`moveTaskToDate`、`getChildTasks`、`searchTasks`。
- **状态管理（`taskStore.ts`）**：10 个 action 全部实现，调用 queries 并同步本地 state。

### 功能点

| 功能 | 实现状态 | 说明 |
| --- | --- | --- |
| 创建日/周/月/年任务 | ✅ 完整 | TaskDetailScreen 4 种类型选择 + DB 约束 |
| 标记完成/未完成 | ✅ 完整 | TaskItem 复选框 → toggleTaskCompleted |
| 编辑任务详情 | ✅ 完整 | TaskDetailScreen 加载并调用 updateTask |
| 删除任务 | ✅ 完整 | 带确认弹窗 → deleteTask |
| 拖拽排序 | ✅ 完整 | 单列 + 分组两种模式，DraggableFlatList |
| 跨日期拖拽 | ⚠️ 部分 | moveTaskToDate 仅改日期，planType 不更新；含 100ms 时序 hack；分组模式同日期重排会波及全部日期 sort_order |
| 多选日期聚合任务 | ✅ 完整 | 最多 3 选，保留空日期分组，分组头显示任务数 |
| 切换日期不改变选中范围 | ✅ 完整 | next/previous 仅改 currentDate；视图类型切换才重置 |
| 时间轴日/周/月/年切换 | ✅ 完整 | TimeAxis 按钮 + getTimeAxisUnits 按视图生成单元 |

### 组件
- **TimeAxis**：视图切换按钮、前后导航、横向滚动时间单元、选中态高亮。
- **TaskItem**：完成切换、标题/描述、计划类型徽章、拖拽手柄。
- **TaskList**：单列与多列分组两种渲染，复杂的跨日期拖拽即时更新逻辑。
- **DatePicker**：自定义 Modal + 滚轮选择，支持"今天/明天"标签与中文周几。

## 三、货币记账模块

### 数据层
- **表**：`transactions`（收入/支出）、`categories`（分类）、`budgets`（预算，按分类月/年）。
- **默认分类**：共 14 个 —— 5 收入（工资、投资、兼职、红包、其他收入）+ 9 支出（餐饮、交通、购物、娱乐、医疗、教育、居住、通讯、其他支出）。
- **Queries**：交易、分类、预算各自的 CRUD（分类缺 update）。
- **Stores**：transactionStore（含统计计算 getStatistics）、categoryStore、budgetStore 均完整实现。

### 功能点

| 功能 | 实现状态 | 说明 |
| --- | --- | --- |
| 交易记录创建（收入/支出） | ✅ 完整 | TransactionDetailScreen + addTransaction |
| 交易记录编辑 | ❌ 未实现 | transactionId 参数读取后未使用，无 updateTransaction 调用 |
| 交易记录删除 | ❌ 未实现 | 无删除按钮，列表点击 onPress 为空 TODO |
| 分类选择（默认 14 个） | ✅ 完整 | 分类网格选择 |
| 余额显示 | ✅ 完整 | 余额 = 收入 - 支出 |
| 交易列表按日期分组 | ✅ 完整 | reduce 分组展示 |
| 收支统计（总额、分类占比） | ✅ 完整 | 概览卡 + 占比百分比 + 进度条 |
| 每日趋势图表 | ✅ 完整 | 柱状图（展示最近 7 天） |
| 预算管理 CRUD（后端） | ✅ 完整 | store + queries 全套 |
| 预算管理 UI | ❌ 未实现 | useBudgetStore 在前端零引用 |
| 自定义分类（后端） | ✅ 完整 | addCategory + createCategory |
| 自定义分类 UI | ❌ 未实现 | 前端无"新建分类"入口 |
| 统计页面入口 | ⚠️ 有问题 | 统计页实现完整，但货币主页无跳转按钮，用户无法从 UI 进入 |

## 四、设置模块

### 功能点

| 功能 | 实现状态 | 说明 |
| --- | --- | --- |
| 主题切换（亮/暗/跟随系统）状态存储 | ⚠️ 部分 | store 逻辑完整并用 AsyncStorage 持久化，但 loadTheme 启动时未调用，重启后主题丢失 |
| 主题应用到 UI | ❌ 未实现 | 所有页面/组件颜色硬编码，切换主题不改变任何颜色；仅 StatusBar 跟随系统 |
| 数据导出为 JSON | ✅ 完整 | export.ts 真实写入文件并唤起分享面板 |
| 数据导入从 JSON | ❌ 未实现（空壳） | import.ts 仅读 + parse + console.log，TODO 明确未写库；SettingsScreen 导入按钮只弹"开发中"Alert；expo-document-picker 依赖声明但从未 import |

## 五、基础设施

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| Expo + RN + TS 项目骨架与配置 | ✅ 完整 | app.json / tsconfig / babel / metro / eas.json 齐全 |
| 数据库初始化与迁移 | ✅ 完整 | app/_layout.tsx 启动时 runMigrations |
| Tab + Stack 导航 | ✅ 完整 | 3 Tab + 3 详情路由全部正确连接 |
| android prebuild 目录 | ✅ 完整 | 标准 Expo 原生工程输出 |
| Web 端适配 | ⚠️ 降级 | expo-sqlite 在 Web 端使用 mock（返回空），Web 端功能不可用 |
| 通用组件 Button/Input/Card/DatePicker | ✅ 完整 | 基本功能可用（颜色硬编码，Card 用动态 require） |

## 六、已知代码层面问题

1. **expo-sqlite API 兼容性风险**：`schema.ts` 使用旧版回调式 `openDatabase()` + `transaction/executeSql`，与安装的 `expo-sqlite@~56` 新版 Promise API（`openDatabaseAsync`）可能不匹配，需真机验证。
2. **大量死代码**：`useDrag` hook、`utils/drag.ts` 三个函数、`database/init.ts` 的 `useDatabaseInit`、`utils/storage.ts` 整个文件、TaskItem 内联编辑状态、多个查询函数/hooks 均已实现但从未被调用。
3. **HomeScreen UI bug**：`src/screens/HomeScreen/index.tsx:145` 多余的 `)` 字符，多选满 3 个时界面显示多余右括号。
4. **import.ts 类型矛盾**：声明返回 `Promise<void>` 但实际 `return data`。
5. **`node_modules` 缺失**：当前仓库未安装依赖，TypeScript 类型检查（`npm run type-check`）无法运行。

## 七、功能完成度总览

| 模块 | 已完成 | 未完成/有问题 |
| --- | --- | --- |
| 任务管理 | 创建/完成/编辑/删除/拖拽排序/多选聚合/视图切换 | 跨日期拖拽（planType 不更新等隐患）、TaskItem 内联编辑死代码 |
| 货币记账 | 交易创建/分类选择/余额/分组/统计/趋势图 | 交易编辑、交易删除、预算 UI、自定义分类 UI、统计页入口 |
| 设置 | 数据导出 | 数据导入、主题应用 UI、主题启动加载 |
| 基础设施 | 骨架/导航/数据库/android | Web 端、expo-sqlite API 兼容性、死代码清理 |
