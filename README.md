# Todododo - 多功能待办事项 App

一个基于 React Native + Expo 构建的跨平台待办事项应用，支持日/周/月/年计划管理。

## 功能特性

- **每日 Todolist**: 简单的每日任务清单
- **多粒度计划**: 支持日计划、周计划、月计划、年计划
- **时间轴界面**: 左侧时间轴，可切换日/周/月/年视图
- **多选分页**: 周视图多选周、月视图多选月、年视图多选年
- **拖拽功能**: 自由拖动列表中的每项任务
- **数据持久化**: 使用 SQLite 本地存储

## 技术栈

- **框架**: React Native + Expo
- **语言**: TypeScript
- **状态管理**: Zustand
- **数据库**: expo-sqlite
- **动画**: react-native-reanimated
- **手势**: react-native-gesture-handler
- **拖拽**: react-native-draggable-flatlist
- **导航**: expo-router
- **日期处理**: date-fns

## 项目结构

```
Todododo/
├── app/                      # expo-router 页面
│   ├── _layout.tsx          # 根布局
│   ├── index.tsx            # 首页
│   ├── task-detail.tsx      # 任务详情
│   └── settings.tsx         # 设置页
├── src/
│   ├── components/          # 可复用 UI 组件
│   │   ├── TimeAxis/        # 时间轴组件
│   │   ├── TaskItem/        # 任务项组件
│   │   ├── TaskList/        # 任务列表组件
│   │   └── common/          # 通用组件
│   ├── screens/             # 页面组件
│   ├── stores/              # Zustand 状态管理
│   ├── database/            # 数据库相关
│   ├── types/               # TypeScript 类型
│   ├── utils/               # 工具函数
│   └── hooks/               # 自定义 Hooks
└── assets/                  # 静态资源
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

## 开发说明

### 数据库

使用 expo-sqlite 进行本地数据存储。数据库初始化时会自动运行迁移脚本。

### 状态管理

使用 Zustand 进行状态管理：
- `taskStore`: 管理任务相关状态
- `viewStore`: 管理视图相关状态

### 组件

- `TimeAxis`: 时间轴组件，支持日/周/月/年视图切换
- `TaskItem`: 单个任务项，支持完成状态切换和长按编辑
- `TaskList`: 任务列表，支持拖拽排序

## 后续计划

- [ ] 日期选择器
- [ ] 通知提醒
- [ ] 数据备份和恢复
- [ ] 主题切换
- [ ] 数据统计图表
- [ ] 云同步

## License

ISC
