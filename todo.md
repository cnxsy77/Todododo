# Todo — 待完善功能清单

> 基于对项目源码的逐文件遍历与功能点验证整理。详细的功能完成度分析见 `doc/FEATURES.md`。
> 生成日期：2026-06-22

## 🔴 严重缺失（功能完全不可用）

- [ ] **数据导入功能未实现**
  - `src/utils/import.ts` 仅完成"读取文件 + JSON.parse + console.log"，第 17 行 `TODO: 实现数据导入逻辑`，未写库。
  - `importData` 从未被任何地方调用；返回类型声明 `Promise<void>` 但实际 `return data`，类型矛盾。
  - `src/screens/SettingsScreen/index.tsx` 导入按钮 `handleImport` 只弹 `Alert('导入功能开发中...')`，未接 `importData`。
  - `expo-document-picker` 在 package.json 声明依赖但代码中从未 import，文件选择器未接入。
  - 需实现：清空现有数据 → 批量插入 tasks/transactions/categories/budgets → 刷新各 store。

- [ ] **主题未应用到 UI**
  - 所有页面与组件 StyleSheet 颜色全部硬编码（`#F2F2F7` / `#FFFFFF` / `#000000` 等），`isDarkMode` 仅在 SettingsScreen 读取用于开关状态。
  - 切换主题不改变任何界面颜色，仅 `StatusBar style="auto"` 跟随系统。
  - 需实现：抽取主题色板（light/dark），所有组件从 theme 读取颜色。

- [ ] **交易编辑功能未实现**
  - `src/screens/TransactionDetailScreen/index.tsx:10` 读取 `transactionId` 后从未使用，未加载已有交易，未调用 `updateTransaction`。
  - 当前页面只能"新建"，无法编辑；`app/_layout.tsx:51` 标题写死为"添加记录"。

- [ ] **交易删除功能未实现**
  - `src/screens/CurrencyScreen/index.tsx:90-91` 交易项 `onPress` 为空函数体，注释 `// TODO: 跳转到交易详情`。
  - 无删除按钮，未调用 `deleteTransaction`。

- [ ] **预算管理 UI 未实现**
  - `budgetStore` + `budgetQueries` 后端 CRUD 完整，但 `useBudgetStore` 在所有 screens/components 中零引用。
  - 无预算设置 / 查看 / 进度展示界面（README 宣称"支持按分类设置预算"与实际不符）。

- [ ] **自定义分类 UI 未实现**
  - `categoryStore.addCategory` + `categoryQueries.createCategory` 后端完整，但前端无"新建分类"入口。
  - README 宣称"支持自定义"分类，用户实际无法通过界面创建。

## 🟡 有问题（功能存在但不可用或有缺陷）

- [ ] **统计页面无入口**
  - `StatisticsScreen` 实现完整，`app/statistics.tsx` 路由已注册，但 `CurrencyScreen` 无任何按钮跳转，用户无法从 UI 进入统计页。

- [ ] **主题启动加载未调用**
  - `themeStore.loadTheme` 从未被调用，App 启动时不加载已保存的主题，每次重启回到默认 `'light'`，AsyncStorage 持久化形同虚设。
  - 需在 `app/_layout.tsx` 启动时调用 `loadTheme()`。

- [ ] **'auto' 主题模式不监听系统变化**
  - `themeStore` 仅在 `setTheme('auto')` 那一刻读一次 `Appearance.getColorScheme()`，未注册 `Appearance.addChangeListener`，系统切换深浅色时 App 不跟随。

- [ ] **跨日期拖拽缺陷**
  - `moveTaskToDate` 只改 `start_date/end_date`，不更新 `plan_type`；将 daily 任务拖到 weekly 范围后，切到周视图按 planType 过滤可能消失。
  - `TaskList/index.tsx:288-290` 用固定 `setTimeout(100ms)` 防回弹，慢设备上可能失效。
  - 分组模式同日期重排分支（`TaskList/index.tsx:293-297`）将所有范围的所有任务 ID 传给 `onReorder`，`updateTaskOrders` 对全部重新编号，重载后可能打乱其他日期排序。

- [ ] **HomeScreen 多选提示 UI bug**
  - `src/screens/HomeScreen/index.tsx:145` 行末多余 `)` 字符，多选满 3 个时界面显示"... (最多 3 个))"。

## 🟢 次要 / 代码质量

- [ ] **TaskItem 内联编辑是死代码**
  - `src/components/TaskItem/index.tsx:22-34` 的 `isEditing/editTitle/handleSave` 中 `setIsEditing(true)` 从未被调用，编辑模式无法进入；`handleSave` 不保存标题。

- [ ] **分类不可修改**
  - store / queries / types 均缺 `updateCategory`，分类只能删除重建。

- [ ] **`utils/storage.ts` 整个文件为死代码**
  - 使用内存对象（非 AsyncStorage，不持久化），`saveSettings/loadSettings/saveTheme/loadTheme` 从未被调用，与 `themeStore` 功能重复。建议删除。

- [ ] **`Card.tsx` 动态 require 反模式**
  - `src/components/common/Card.tsx:12` 用 `require('react-native')` 动态引入 `TouchableOpacity`，应改为静态 import。

- [ ] **大量未接入 UI 的死代码**
  - `src/hooks/useDrag.ts`、`src/utils/drag.ts`（3 个函数）、`src/database/init.ts`（`useDatabaseInit`）、`getTaskById/getChildTasks/searchTasks/loadTasksByPlanType/loadTasksByDateRange` 及对应 hooks 均已实现但从未被调用。

- [ ] **expo-sqlite API 兼容性风险**
  - `src/database/schema.ts` 使用旧版回调式 `openDatabase()` + `transaction/executeSql`，与 `expo-sqlite@~56` 新版 Promise API（`openDatabaseAsync`）不匹配，需真机验证数据库层是否正常工作。

- [ ] **Web 端不可用**
  - `expo-sqlite` 在 Web 端使用 mock 返回空结果，Web 端功能实际不可用（预期降级，需在文档中说明或禁用 Web 入口）。

- [ ] **tsconfig `baseUrl` 弃用警告**
  - `npm run type-check` 报 `Option 'baseUrl' is deprecated`，需添加 `"ignoreDeprecations": "6.0"` 或迁移路径别名写法（TypeScript 7 将移除）。
