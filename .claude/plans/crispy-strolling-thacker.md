# Todododo 项目归纳

## 项目概述

**Todododo** 是一个基于 **React Native + Expo** 构建的跨平台待办事项管理应用，核心特色是支持**日/周/月/年**多粒度计划管理，配合时间轴界面进行任务组织。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React Native + Expo (SDK 50) |
| 语言 | TypeScript |
| 路由 | expo-router (文件路由系统) |
| 状态管理 | Zustand |
| 数据库 | expo-sqlite (本地持久化) |
| 动画 | react-native-reanimated |
| 手势 | react-native-gesture-handler |
| 拖拽 | react-native-draggable-flatlist |
| 日期处理 | date-fns |

---

## 核心功能

### 1. 多粒度计划管理
- **日计划 (daily)**: 管理每日待办事项
- **周计划 (weekly)**: 规划每周任务
- **月计划 (monthly)**: 制定月度目标
- **年计划 (yearly)**: 设定年度计划

### 2. 时间轴界面
- 左侧时间轴导航
- 支持日/周/月/年视图切换
- 左右滑动切换时间范围
- 支持多选时间单元（最多3个）

### 3. 任务管理
- 创建、编辑、删除任务
- 标记完成/未完成状态
- 拖拽排序任务顺序
- 拖拽移动任务到其他日期

### 4. 多选分页功能
- 周视图可多选多周
- 月视图可多选多月
- 年视图可多选多年
- 聚合显示选中时间范围的所有任务

---

## 项目结构

```
Todododo/
├── app/                          # Expo Router 页面路由
│   ├── _layout.tsx              # 根布局配置
│   ├── index.tsx                # 首页入口
│   ├── task-detail.tsx          # 任务详情页
│   └── settings.tsx             # 设置页
│
├── src/
│   ├── components/              # UI 组件
│   │   ├── TimeAxis/            # 时间轴组件
│   │   ├── TaskItem/            # 任务卡片组件
│   │   ├── TaskList/            # 任务列表组件
│   │   ├── DatePicker/          # 日期选择器
│   │   └── common/              # 通用组件(Button, Input, Card)
│   │
│   ├── screens/                 # 页面组件
│   │   ├── HomeScreen/          # 主页面
│   │   ├── TaskDetailScreen/    # 任务详情页
│   │   └── SettingsScreen/      # 设置页
│   │
│   ├── stores/                  # Zustand 状态管理
│   │   ├── taskStore.ts         # 任务状态
│   │   └── viewStore.ts         # 视图状态
│   │
│   ├── database/                # 数据库层
│   │   ├── schema.ts            # 数据库结构定义
│   │   ├── migrations.ts        # 迁移脚本
│   │   ├── queries.ts           # CRUD 查询
│   │   └── init.ts              # 初始化逻辑
│   │
│   ├── types/                   # TypeScript 类型
│   │   ├── task.ts              # Task, PlanType 等类型
│   │   └── view.ts              # ViewType, ViewState 等类型
│   │
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useTasks.ts          # 任务查询 hooks
│   │   ├── useView.ts           # 视图切换 hooks
│   │   └── useDrag.ts           # 拖拽 hooks
│   │
│   └── utils/                   # 工具函数
│       ├── date.ts              # 日期格式化、时间范围计算
│       ├── drag.ts              # 拖拽工具
│       └── storage.ts           # 本地存储
│
├── android/                     # Android 原生配置
├── assets/                      # 静态资源
└── package.json
```

---

## 数据模型

### Task (任务)
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  planType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: number;      // 时间戳
  endDate?: number;       // 时间戳
  isCompleted: boolean;
  order: number;          // 排序
  parentTaskId?: string;  // 层级支持
  createdAt: number;
  updatedAt: number;
}
```

### ViewState (视图状态)
```typescript
interface ViewState {
  currentView: 'day' | 'week' | 'month' | 'year';
  currentDate: number;        // 当前时间戳
  selectedRanges: number[];   // 多选的时间单元
}
```

---

## 数据库操作 (queries.ts)

- `getAllTasks()` - 获取所有任务
- `getTasksByPlanType(planType)` - 按计划类型获取
- `getTasksByDateRange(start, end)` - 按日期范围获取
- `getTaskById(id)` - 获取单个任务
- `createTask(input)` - 创建任务
- `updateTask(id, input)` - 更新任务
- `deleteTask(id)` - 删除任务
- `updateTaskOrders(taskIds)` - 批量更新排序
- `moveTaskToDate(id, newStart, newEnd)` - 移动任务到新日期
- `getChildTasks(parentId)` - 获取子任务
- `searchTasks(query)` - 搜索任务

---

## 运行方式

```bash
npm install       # 安装依赖
npm start         # 启动 Expo 开发服务器
npm run ios       # 运行 iOS 模拟器
npm run android   # 运行 Android 模拟器
npm run web       # 运行 Web 版本
```

---

## 后续优化方向

- [ ] 日期选择器组件
- [ ] 通知提醒功能
- [ ] 数据备份和恢复
- [ ] 主题切换（深色模式）
- [ ] 数据统计图表
- [ ] 云同步功能
- [ ] 搜索和过滤功能
- [ ] 拖拽体验优化
