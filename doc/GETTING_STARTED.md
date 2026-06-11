# 如何运行 Todododo 项目

## 环境要求

### 开发环境
- **Node.js**: 推荐 v18 或更高版本
- **npm**: 推荐 v9 或更高版本
- **Git**: 用于版本控制

### 平台要求

#### iOS 开发
- macOS 操作系统
- Xcode 14 或更高版本
- iOS 模拟器（Xcode 自带）或真机

#### Android 开发
- macOS / Windows / Linux
- Android Studio（安装 Android SDK）
- Android 模拟器或真机

#### Web 开发
- 任意操作系统
- 现代浏览器（Chrome、Firefox、Safari、Edge）

---

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd Todododo
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm start
```

启动后会看到 Expo DevTools 界面，按以下方式选择运行平台：

---

## 运行方式

### 方式一：使用 Expo Go（推荐新手）

适用于 iOS/Android 平台，无需配置开发环境。

1. 在手机上下载 **Expo Go** App
   - iOS: App Store 搜索 "Expo Go"
   - Android: Google Play 搜索 "Expo Go"

2. 确保手机和电脑在同一 WiFi 网络下

3. 扫描终端显示的二维码

4. 等待项目加载完成

### 方式二：使用模拟器

#### iOS 模拟器（仅 macOS）

```bash
npm run ios
```

首次运行可能需要几分钟编译。

#### Android 模拟器

```bash
npm run android
```

需要先启动 Android Studio 中的模拟器（AVD）。

### 方式三：Web 浏览器

```bash
npm run web
```

项目将在 `http://localhost:3000` 启动。

**注意**: Web 端使用模拟数据库，数据不会持久化。

---

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm start` | 启动 Expo 开发服务器 |
| `npm run ios` | 在 iOS 模拟器运行 |
| `npm run android` | 在 Android 模拟器运行 |
| `npm run web` | 在 Web 浏览器运行 |

---

## 常见问题

### 问题 1: iOS 运行失败

**错误**: `Command failed: xcodebuild ...`

**解决**:
1. 确保 Xcode 已安装并同意许可协议
2. 运行 `sudo xcodebuild -license` 同意许可
3. 清理缓存: `rm -rf ios/Pod ios/Pods && cd ios && pod install`

### 问题 2: Android 运行失败

**错误**: `Failed to install the app`

**解决**:
1. 确保已启动 Android 模拟器
2. 检查 `ANDROID_HOME` 环境变量是否配置
3. 运行 `adb devices` 确认设备连接

### 问题 3: 依赖安装失败

**解决**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules
npm install
```

### 问题 4: Metro bundler 卡住

**解决**:
```bash
# 清除缓存并重启
npm start -- --clear
```

---

## 项目结构

```
Todododo/
├── app/                      # Expo Router 页面路由
│   ├── _layout.tsx          # 根布局
│   ├── index.tsx            # 首页
│   ├── task-detail.tsx      # 任务详情
│   └── settings.tsx         # 设置页
├── src/
│   ├── components/          # UI 组件
│   │   ├── TimeAxis/        # 时间轴组件
│   │   ├── TaskItem/        # 任务项组件
│   │   ├── TaskList/        # 任务列表组件
│   │   ├── DatePicker/      # 日期选择器
│   │   └── common/          # 通用组件
│   ├── screens/             # 页面组件
│   ├── stores/              # Zustand 状态管理
│   ├── database/            # SQLite 数据库
│   ├── types/               # TypeScript 类型
│   ├── utils/               # 工具函数
│   └── hooks/               # 自定义 Hooks
├── android/                 # Android 配置
├── assets/                  # 静态资源
├── doc/                     # 项目文档
├── package.json             # 项目依赖
├── tsconfig.json            # TypeScript 配置
└── app.json                 # Expo 配置
```

---

## 技术栈

| 技术 | 用途 |
|------|------|
| React Native | 跨平台框架 |
| Expo | 开发工具链 |
| TypeScript | 类型安全 |
| expo-router | 页面路由 |
| Zustand | 状态管理 |
| expo-sqlite | 本地数据库 |
| react-native-draggable-flatlist | 拖拽功能 |
| date-fns | 日期处理 |

---

## 下一步

- 查看 [README.md](../README.md) 了解项目功能
- 查看 [IMPLEMENTATION.md](../IMPLEMENTATION.md) 了解实现细节
- 开始开发！