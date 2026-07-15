# 任务提醒/通知功能实现方案

## 目标
接入 `expo-notifications`，任务可设定提醒时间（日期+时间，精确到分钟），到时本地推送通知；支持取消（删除/完成/清除提醒时）。

## 1. 依赖安装（需用户重建 dev client）
```
npx expo install expo-notifications @react-native-community/datetimepicker
```
- `expo install` 自动匹配 expo 56 版本
- 安装后需重建 native dev client（`npm run android`），expo-notifications 与 datetimepicker 均含 native 代码

## 2. 数据层
- **迁移 v3**（`migrations.ts`，`CURRENT_VERSION = 3`）：`ALTER TABLE tasks ADD COLUMN reminder_at INTEGER`（时间戳，null=无提醒）
- **`types/task.ts`**：`Task.reminderAt?: number`；`CreateTaskInput.reminderAt?: number`；`UpdateTaskInput.reminderAt?: number | null`（null 清除，同 endDate 模式）
- **`queries.ts`**：mapRow 加 `reminderAt`；createTask INSERT 加 `reminder_at`；updateTask 处理 reminderAt（null 写 NULL / undefined 不更新）；子任务**不**强制继承 reminderAt（独立提醒）

## 3. 通知服务（新文件 `src/services/notificationService.ts`）
- 模块顶层调用 `Notifications.setNotificationHandler`（前台收到时展示 alert+sound）
- `initNotifications()`：Android 创建 channel `task-reminders`（HIGH importance）
- `ensureNotificationPermissions(): Promise<boolean>`：getPermissionsAsync → requestPermissionsAsync
- `scheduleTaskReminder(taskId, title, reminderAt)`：先 `cancelScheduledNotificationAsync(taskId)` 清旧，再 `scheduleNotificationAsync`（identifier=taskId，content 标题/正文/data.taskId，trigger={ type: SchedulableTriggerInputTypes.DATE, date }）；`reminderAt <= now` 跳过调度
- `cancelTaskReminder(taskId)`：cancelScheduledNotificationAsync
- Web 平台所有方法早返回（同 sqlite 降级风格）

## 4. store 集成（`taskStore.ts`）
- `createTask`：创建后若有 reminderAt → scheduleTaskReminder
- `updateTask`：reminderAt 变更时 cancel +（新值非 null）schedule
- `deleteTask`：cancelTaskReminder（含子任务）
- `toggleTaskCompleted`：完成时 cancelTaskReminder（已完成不再打扰）

## 5. UI（`TaskDetailScreen`）
- reminderAt 状态 + useEffect 加载（existingTask / 父任务 / 新建）
- 新增「提醒」section：封装 `ReminderPicker`（基于 `@react-native-community/datetimepicker` mode=datetime，处理 Android 弹窗/iOS 内联差异），可设定/清除
- handleSave：编辑分支传 `reminderAt ?? null`；保存时若 reminderAt 在未来，调用 ensureNotificationPermissions（拒绝则提示"未开启通知权限"，但仍保存 reminderAt）

## 6. `_layout.tsx`
- import notificationService（触发顶层 setNotificationHandler）
- init() 里调用 initNotifications()（创建 channel）；权限不在启动请求

## 7. 边界
- Web：提醒 UI 仍显示并存 DB，service 静默跳过调度
- 过期提醒：reminderAt <= now 不调度（静默），不阻拦保存
- 子任务：独立提醒，不继承父
- 完成：取消未触发提醒；取消完成不自动恢复（用户需重设）

## 8. 可选增强（默认不做，待确认）
- 点击通知跳转 `/task-detail`：_layout 加 `addNotificationResponseReceivedListener`，用 data.taskId 路由跳转

## 决策点（推荐方案，可在批准时调整）
1. 提醒精度：日期+时间（分钟），DateTimePicker
2. 完成态：取消未触发提醒（推荐）
3. 权限请求时机：设提醒保存时（非启动时）
4. 点击通知跳转：默认不做

## 验证
- `npm run type-check`（tsc --noEmit，含 expo-notifications 类型校验 API 字段）
- 真机：设提醒 → 到时收通知 → 完成/删除/清除提醒验证取消

## 涉及文件
新增：`src/services/notificationService.ts`、`src/components/ReminderPicker/index.tsx`
修改：`package.json`、`migrations.ts`、`types/task.ts`、`queries.ts`、`taskStore.ts`、`TaskDetailScreen/index.tsx`、`app/_layout.tsx`
