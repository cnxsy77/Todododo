# 任务列表按视图精确加载优化

## 背景
当前 `getAllTasks` 一次性 `SELECT * FROM tasks ORDER BY sort_order` 全量加载到 `store.tasks`，首页 `buildTree` 再在内存按 planType+ranges 过滤。问题：任务量大时全量驻留内存；每次增删改/拖拽 `state.tasks.map()` 全量 O(n)；`buildTree` 每次 tasks 变化全量 filter+sort 重算。

渲染层 `DraggableFlatList`（基于 FlatList）**已虚拟化**，屏幕只渲染可见 cell，渲染非瓶颈。首页列表实际只需当前 range+planType 的任务；搜索/筛选本就只搜当前 range。导出（export.ts）仍需全量。

关键约束：拖拽只发生在当前可见 range（≤3 个）内；`sort_order` 只需 range 内相对正确（跨 range 绝对值无所谓，buildTree 分组后按 range 排序）；父子强制同 range。-> 按视图精确加载不破坏拖拽。

## 1. 数据层 `src/database/queries.ts`
- 新增 `getTasksByPlanTypeAndRanges(planType, ranges): Promise<Task[]>`：动态构建 `WHERE plan_type = ? AND (start_date BETWEEN ? AND ? OR ...)`，`ORDER BY sort_order ASC`；ranges 为空返回 `[]`。父子同 range，查 startDate 命中即可覆盖父子。
- 保留 `getAllTasks`（export.ts 用）、`getTaskById`。

## 2. store `src/stores/taskStore.ts`
- state 增加 `currentPlanType: PlanType | null`、`currentRanges: { start: number; end: number }[] | null`。
- `loadTasks(planType?, ranges?)`：传参则更新 currentPlanType/currentRanges 并用 `getTasksByPlanTypeAndRanges` 加载；无参则用已存参数重新加载（供 SettingsScreen import 后刷新）。`set({ tasks, currentPlanType, currentRanges })`。
- 抽内部 helper `isInView(task): boolean`（planType 匹配 + startDate 落在 currentRanges）。
- 写操作改为作用于"当前视图任务集"，按需加入/移除：
  - `addTask`：创建后若 `isInView(newTask)` 则追加末尾（新任务 sort_order 为 MAX+1）；否则不加入（下次切到该 range 加载）。子任务同理（父在视图则子必在）。
  - `updateTask`：map 更新匹配项；若更新后离开当前视图则从 tasks 移除；级联子任务同更新（同 range，子在数组则一并更新）。
  - `deleteTask`：filter 移除 id 及 `parentTaskId===id`。
  - `toggleTaskCompleted`：map 更新（含子）。
  - `reorderTasks`：按 taskIds 重排当前 tasks（逻辑同现有，仅作用于当前数组）。
  - `moveTaskToDate` / `moveTaskToDateWithOrder`：更新匹配项日期 + 重排（目标 range 在当前视图，不移除）。

## 3. hook `src/hooks/useTasks.ts`
- `useTasksByRanges`：把"仅挂载 loadTasks()"改为 `useEffect(() => { loadTasks(planType, ranges); }, [planType, JSON.stringify(ranges)])`，range/planType 变化按需查库。
- 首次加载用 `isLoading` 展示占位（避免空闪烁）；后续 range 切换"先留旧数据、查完静默替换"不显示 loading（接近瞬时）。
- `buildTree` 保留（输入已缩小为当前视图任务）；`groupedTasks` 的异步派生 useEffect **保留不动**（拖拽防残影时序依赖）。

## 4. `src/components/TaskList/index.tsx`
- 两处 `DraggableFlatList` 透传虚拟化参数：`initialNumToRender={8}`、`maxToRenderPerBatch={8}`、`updateCellsBatchingPeriod={50}`、`windowSize={7}`。
- 不开 `removeClippedSubviews`（与 DraggableFlatList 测量有兼容风险）。

## 5. `src/screens/TaskDetailScreen/index.tsx`
- 保持从 `store.tasks` 读 existingTask/parentTask/children：Stack 全屏路由下用户无法在详情页期间切视图，当前视图缓存有效，安全。
- 依赖 store 写操作把新建子任务正确加入 tasks（第 2 节 addTask 已覆盖）。

## 6. `src/screens/SettingsScreen/index.tsx`
- import 后 `loadTasks()` 无参调用语义改为"用上次视图参数重新加载"，仍有效；`summary.tasks` 来自 importData 返回值，不受影响。预计无需改动。

## 边界
- ranges 为空：loadTasks 返回空，列表显示 emptyMessage。
- 切视图异步：极短，首屏 loading；后续静默替换。
- 拖拽：仅当前可见 range 内，sort_order range 内相对正确即可，行为不变。
- 导出：仍全量 `getAllTasks`。
- Web：expo-sqlite Web 降级返回空，无影响。

## 验证
- `npm run type-check`
- 真机：切换日/周/月/年视图、多选 range、增删改任务、拖拽排序/跨日拖拽、搜索筛选、导出/导入，确认行为与优化前一致；任务量大（上百）下首屏与滚动流畅度。

## 涉及文件
修改：`src/database/queries.ts`、`src/stores/taskStore.ts`、`src/hooks/useTasks.ts`、`src/components/TaskList/index.tsx`
可能微调：`src/screens/SettingsScreen/index.tsx`（loadTasks 无参兼容）
新增：无
