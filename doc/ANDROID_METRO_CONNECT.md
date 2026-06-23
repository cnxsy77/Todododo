# Android Studio + WSL2 跨环境开发与调试

本文记录在 **WSL2（mirrored 网络模式）+ Windows Android Studio + AVD 模拟器** 环境下，从零搭建到日常调试的完整流程，含每一步命令。

适用于：App 启动后弹出「需要输入 exp:// 地址」页面，或连接 `192.168.1.4:8081` 报 `ECONNREFUSED` 的情况。

---

## 一、跨环境职责划分

本项目的开发环境跨 **Windows / WSL 两侧**，已验证可用的职责划分如下：

| 侧 | 工具 | 职责 |
|----|------|------|
| **Windows** | Android Studio | 启动/管理 AVD 模拟器、查看 Logcat、编辑原生代码（可选） |
| **WSL** | node / Java 17 / adb / gradle | 源码、`node_modules`、`expo start`（Metro）、**原生编译**（`expo run:android`）、推送安装到模拟器 |

关键点（与直觉不同）：

- **原生编译发生在 WSL 内**，不是 Windows。`npx expo run:android` 会调用 WSL 的 gradle daemon（Java 17）编译，再通过 WSL 的 adb 安装到模拟器。
- **WSL 的 adb 能直接看到 Windows 上的 AVD**：mirrored 网络模式下，`adb devices` 会列出如 `emulator-5556`，无需手动 `adb connect`。
- **Android Studio 主要用于管理模拟器和看 Logcat**，不一定要用它点 ▶️ Run（用 Run 反而容易弹出「输入 exp:// 地址」页面，见下文）。

> 简言之：**Windows 出模拟器，WSL 出代码 + Metro + 编译**。两者通过 `10.0.2.2 → Windows localhost → WSL Metro` 打通网络，通过 WSL adb 直连模拟器打通安装链路。

---

## 二、网络链路（理解即可）

```
AVD 模拟器 (Windows)
   │  访问宿主机 localhost 用别名 10.0.2.2
   ▼
Windows localhost:8081
   │  WSL2 mirrored 模式：Windows localhost 自动通到 WSL
   ▼
WSL 里的 Metro (监听 *:8081)
```

因此 App 连接 Metro 用 `exp://10.0.2.2:8081`，**不是**局域网 IP `192.168.1.4`。

- ❌ `exp://192.168.1.4:8081` —— 对模拟器是「局域网另一台机器」，`ECONNREFUSED`。
- ✅ `exp://10.0.2.2:8081` —— 模拟器别名 → Windows localhost → WSL Metro。

> 真机场景不同：mirrored 模式下 Windows 只转发自身 localhost 到 WSL，不转发局域网设备请求，故真机连 `192.168.1.4:8081` 也会被拒。真机需另行处理（`adb reverse` / 端口转发），不在本文范围。

---

## 三、环境前提（一次性）

### 3.1 Windows 侧

1. 安装 **Android Studio**，通过 SDK Manager 安装 Android SDK。
2. 通过 **Device Manager / Virtual Device** 创建一个 AVD 模拟器并启动。

> 模拟器必须处于运行状态，后续 WSL 的 adb 才能看到它。

### 3.2 WSL 侧（本项目已具备，列出供核对）

```bash
node -v          # 已具备: v24.17.0
npm -v           # 已具备: 11.13.0
java -version    # 已具备: openjdk 17（gradle 8.13 需要 JDK 17）
adb --version    # 已具备: 1.0.41（debian 包，能连模拟器即可）
```

确认 WSL adb 能看到 Windows 的 AVD：

```bash
adb devices
# 期望输出类似:
# List of devices attached
# emulator-5556    device
```

若看不到模拟器，确认：① Windows 上 AVD 已启动；② WSL2 处于 mirrored 网络模式（`.wslconfig` 中 `networkingMode=mirrored`）。

---

## 四、首次搭建流程（从零到能调试）

> 以下命令均在 **WSL** 内、项目根目录 `/home/xqx/project/Todododo` 执行，除非另注「Windows」。

### 步骤 1：安装依赖（仅首次）

```bash
cd /home/xqx/project/Todododo
npm install
```

### 步骤 2：启动 AVD 模拟器（Windows）

在 Android Studio 的 Device Manager 中启动一个 AVD，或用命令行（Windows PowerShell）：

```powershell
# Windows 侧，路径替换为你的 SDK 实际位置
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd <你的AVD名称>
```

回到 WSL 确认可见：

```bash
adb devices        # 应看到 emulator-xxxx  device
```

### 步骤 3：启动 Metro（WSL，保持运行）

```bash
npm start          # 等价于 expo start
```

此终端保持开启，不要关闭。另开一个 WSL 终端执行后续步骤。

验证 Metro 可达：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/status
# 期望输出: 200
```

### 步骤 4：编译并安装 dev client 到模拟器（WSL，首次或原生改动时）

```bash
npx expo run:android
```

此命令会：

1. 调用 WSL 的 gradle daemon 编译原生工程（首次较慢，后续增量快）；
2. 通过 WSL adb 把 APK 安装到模拟器；
3. **以带 dev server URL 的 intent 启动 App**，自动连 Metro——通常不会弹「输入 exp:// 地址」页面。

> 若改动了 `android/` 目录或新增了带原生代码的依赖，需重新执行本步。纯 JS/TS 改动**不需要**重新编译。

### 步骤 5：（兜底）若仍弹出「输入 exp:// 地址」页面

如果 App 仍未连上（例如曾用 Android Studio 的 Run 启动过），在输入页填：

```
exp://10.0.2.2:8081
```

`expo-dev-client` 会记住该地址，**以后自动连接，无需再输**。

---

## 五、日常调试流程（App 已安装后）

纯 JS/TS 开发时，**不需要**每次都编译，流程极简：

### 5.1 启动会话

1. **Windows**：启动 AVD 模拟器（若未开）。
2. **WSL**：启动 Metro（若未开）：
   ```bash
   npm start
   ```
3. **WSL**：在 Metro 终端按 `a`，Expo 会用正确 URL 的 intent 拉起已安装的 App 并自动连 Metro。

### 5.2 修改代码 → 热更新

直接编辑 `app/`、`src/` 下的 JS/TS 文件，Metro 自动热更新到 App。

若未自动刷新，在 App 内摇一摇设备 → **Reload**，或 Metro 终端按 `r`。

### 5.3 查看 Logcat（可选，Windows 或 WSL 均可）

WSL 侧直接用 adb 看：

```bash
adb logcat -s ReactNativeJS:*   # 只看 JS console
# 或查看全部:
adb logcat
```

也可在 Windows 的 Android Studio **Logcat 面板**查看同一模拟器（Android Studio 会自动连上本机 AVD）。

### 5.4 改了原生代码后重新编译

当改动涉及 `android/` 目录或新增原生依赖时：

```bash
# WSL，Metro 保持运行
npx expo run:android
```

编译完成后 App 会自动重启并连 Metro。

---

## 六、命令速查

| 场景 | 命令（WSL） | 说明 |
|------|-------------|------|
| 启动 Metro | `npm start` | 保持运行 |
| 验证 Metro | `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/status` | 期望 200 |
| 看模拟器 | `adb devices` | 应列出 emulator-xxxx |
| 首次/原生改动后编译安装 | `npx expo run:android` | 自动连 Metro |
| 日常拉起 App | Metro 终端按 `a` | 无需重新编译 |
| 手动刷新 | Metro 终端按 `r`，或 App 内摇一摇 → Reload | — |
| 看 JS 日志 | `adb logcat -s ReactNativeJS:*` | — |
| 兜底连接地址 | `exp://10.0.2.2:8081` | 仅在弹输入页时填 |

---

## 七、常见问题排查

| 现象 | 原因 | 处理 |
|------|------|------|
| 弹出「输入 exp:// 地址」页面 | App 启动未带 dev server URL（常见于 Android Studio 的 Run 启动） | 填 `exp://10.0.2.2:8081`；或改用 `npx expo run:android` / Metro 终端按 `a` 启动 |
| `ECONNREFUSED /192.168.1.4:8081` | 模拟器访问宿主机应用 `10.0.2.2`，非局域网 IP | 改用 `exp://10.0.2.2:8081` |
| `adb devices` 看不到模拟器 | AVD 未启动 / WSL 非 mirrored 模式 | Windows 启动 AVD；确认 `.wslconfig` 的 `networkingMode=mirrored` |
| 8081 端口未监听 | Metro 未启动 | `npm start` |
| 改了 JS 不生效 | App 连的是旧 bundle / 未连 Metro | Metro 终端按 `a` 或 `r`；App 内摇一摇 → Reload |
| 改了原生代码不生效 | 仅 JS 热更新，原生改动需重新编译 | `npx expo run:android` |
| gradle 编译失败（JDK 版本） | 需要 JDK 17 | WSL 安装 `sudo apt install openjdk-17-jdk` 并设为默认 |
