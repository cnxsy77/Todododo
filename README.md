# Todododo - 多功能待办事项 App

一个基于 React Native + Expo 构建的跨平台待办事项应用，支持任务管理、货币记账、数据统计等功能。

## 功能特性

### 任务管理
- **多粒度计划**: 支持日计划、周计划、月计划、年计划
- **时间轴界面**: 可切换日/周/月/年视图
- **多选分页**: 周视图多选周、月视图多选月、年视图多选年
- **拖拽功能**: 自由拖动列表中的每项任务
- **跨日期拖拽**: 支持将任务拖拽到其他日期

### 货币记账
- **交易记录**: 收入/支出记录，支持分类和备注
- **分类管理**: 内置常用分类，支持自定义
- **数据统计**: 收支统计、分类占比、每日趋势
- **预算管理**: 支持按分类设置预算（月/年）

### 设置
- **主题切换**: 支持亮色/暗色/跟随系统
- **数据导出**: 导出数据为 JSON 文件
- **数据导入**: 从 JSON 文件恢复数据

## 技术栈

- **框架**: React Native + Expo
- **导航**: expo-router (Tabs + Stack)
- **语言**: TypeScript
- **状态管理**: Zustand
- **数据库**: expo-sqlite
- **动画**: react-native-reanimated
- **手势**: react-native-gesture-handler
- **拖拽**: react-native-draggable-flatlist
- **日期处理**: date-fns

## 项目结构

```
Todododo/
├── app/                      # expo-router 页面
│   ├── _layout.tsx          # 根布局
│   ├── (tabs)/              # Tab 导航
│   │   ├── _layout.tsx      # Tab 布局
│   │   ├── tasks/           # 任务 Tab
│   │   ├── currency/        # 货币 Tab
│   │   └── settings/        # 设置 Tab
│   ├── task-detail.tsx      # 任务详情
│   ├── transaction-detail.tsx  # 交易详情
│   └── statistics.tsx       # 统计页面
├── src/
│   ├── components/          # UI 组件
│   │   ├── TimeAxis/        # 时间轴组件
│   │   ├── TaskItem/        # 任务项组件
│   │   ├── TaskList/        # 任务列表组件
│   │   ├── DatePicker/      # 日期选择器
│   │   └── common/          # 通用组件
│   ├── screens/             # 页面组件
│   │   ├── HomeScreen/      # 主页
│   │   ├── TaskDetailScreen/
│   │   ├── CurrencyScreen/
│   │   ├── TransactionDetailScreen/
│   │   ├── StatisticsScreen/
│   │   └── SettingsScreen/
│   ├── stores/              # Zustand 状态管理
│   │   ├── taskStore.ts
│   │   ├── viewStore.ts
│   │   ├── transactionStore.ts
│   │   ├── categoryStore.ts
│   │   ├── budgetStore.ts
│   │   └── themeStore.ts
│   ├── database/            # SQLite 数据库
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   ├── queries.ts       # 任务查询
│   │   ├── transactionQueries.ts
│   │   ├── categoryQueries.ts
│   │   └── budgetQueries.ts
│   ├── types/               # TypeScript 类型
│   │   ├── task.ts
│   │   ├── view.ts
│   │   └── transaction.ts
│   ├── utils/               # 工具函数
│   │   ├── export.ts        # 数据导出
│   │   ├── import.ts        # 数据导入
│   │   ├── date.ts
│   │   ├── drag.ts
│   │   └── storage.ts
│   └── hooks/               # 自定义 Hooks
└── doc/                     # 项目文档
    └── GETTING_STARTED.md
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

### 运行在 iOS 上

```bash
npm run ios
```

### 运行在 Android 上

```bash
npm run android
```

## 数据库

项目使用 expo-sqlite 进行本地数据存储，包含以下表：

- **tasks**: 任务记录
- **transactions**: 交易记录
- **categories**: 分类
- **budgets**: 预算

## 开发说明

### 数据导出

导出数据为 JSON 文件，包含所有任务、交易、分类和预算信息。

### 数据导入

从 JSON 文件恢复数据。

### 主题切换

支持三种主题模式：
- 亮色
- 暗色
- 跟随系统

## License

ISC