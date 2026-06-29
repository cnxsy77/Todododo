# WSL2 配置 Git 代理访问 GitHub

> 适用环境：WSL2（mirrored 网络模式）+ Windows 侧运行 VPN/代理（端口 7890，Clash 默认）
> 问题表现：WSL 内 `git push` / `git fetch` 报 `Failed to connect to github.com port 443` 或 `Connection timed out`

## 一、前提确认

### 1.1 WSL2 处于 mirrored 网络模式

mirrored 模式下，WSL 与 Windows 共享 localhost，因此 WSL 内可直接用 `127.0.0.1` 访问 Windows 侧的代理。

确认方法：`.wslconfig`（位于 Windows 用户目录 `C:\Users\<用户名>\.wslconfig`）中包含：

```ini
[wsl2]
networkingMode=mirrored
```

### 1.2 验证代理端口可达

在 WSL 内测试 7890 端口是否通：

```bash
timeout 3 bash -c "echo > /dev/tcp/127.0.0.1/7890" && echo "OPEN" || echo "REFUSED"
```

- 输出 `OPEN` → 代理可达，继续配置。
- 输出 `REFUSED` → 检查：① Windows 侧 VPN/Clash 是否运行；② Clash 是否开启「允许局域网连接 / Allow LAN」；③ 是否为 mirrored 模式。

> 若非 mirrored 模式，需用 Windows 宿主 IP（`ip route | grep default | awk '{print $3}'`）代替 `127.0.0.1`，且 Clash 必须开启 Allow LAN。

## 二、方式一：全局代理（所有 git 仓库都走代理）

让本机**所有** git 仓库的 HTTP/HTTPS 操作都走代理。

### 配置

```bash
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```

### 验证

```bash
git config --global --get http.proxy    # 应输出 http://127.0.0.1:7890
git config --global --get https.proxy   # 应输出 http://127.0.0.1:7890
```

### 清除

VPN 关闭时全局代理会导致所有 git 操作变慢/失败，需清除：

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### 适用场景与缺点

- **适用**：本机所有 git 仓库都需要走代理（例如都在 GitHub/GitLab 外网）。
- **缺点**：会同时影响内网/公司仓库（本应直连的也会被强制走代理，可能失败或变慢）。VPN 关闭后忘记清除会出问题。

## 三、方式二：只对 GitHub 生效（推荐）

只让 `github.com` 的请求走代理，其他仓库（内网等）保持直连。日常最省心。

### 配置

```bash
git config --global http.https://github.com/.proxy http://127.0.0.1:7890
```

> 注意：键名是 `http.https://github.com/.proxy`（`http.` 前缀 + `https://github.com/` URL + `.proxy`）。这是 git 的「按 URL 前缀匹配代理」机制，只匹配 `https://github.com/` 开头的请求。

### 验证

```bash
# 全局代理应为空
git config --global --get http.proxy        # (无输出)
git config --global --get https.proxy       # (无输出)

# github 专用代理应存在
git config --global --get http.https://github.com/.proxy   # http://127.0.0.1:7890

# 实测连通性（应返回远端 HEAD commit hash）
git ls-remote https://github.com/cnxsy77/Todododo.git HEAD
```

### 清除

```bash
git config --global --unset http.https://github.com/.proxy
```

### 适用场景与优点

- **适用**：只有 GitHub 需要代理，内网/其他仓库直连。
- **优点**：不影响其他仓库；VPN 关闭时只需对 GitHub 操作受影响，内网仓库不受牵连。

## 四、从方式一切换到方式二

```bash
# 1. 清除全局代理
git config --global --unset http.proxy
git config --global --unset https.proxy

# 2. 设置 GitHub 专用代理
git config --global http.https://github.com/.proxy http://127.0.0.1:7890
```

## 五、常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| `Connection timed out` 连 443 | 代理未配 / VPN 未开 / 端口不对 | 确认 VPN 运行、7890 端口、按上文配置代理 |
| `Connection refused` 127.0.0.1:7890 | 非 mirrored 模式，或 Clash 未开 Allow LAN | 用 Windows 宿主 IP；Clash 开启 Allow LAN |
| 配了代理仍超时 | Clash 未开「系统代理/TUN」或规则未放行 github.com | Clash 里确认 github.com 走代理节点 |
| 内网仓库变慢/失败 | 用了全局代理（方式一）影响了内网 | 改用方式二（只对 GitHub 生效） |
| 想完全改用 SSH 绕过 HTTP 代理 | — | `git remote set-url origin git@github.com:cnxsy77/Todododo.git`（需先配好 GitHub SSH key） |

## 六、当前项目配置

本项目（Todododo）已采用**方式二（只对 GitHub 生效）**：

```
git config --global http.https://github.com/.proxy http://127.0.0.1:7890
```

- remote：`https://github.com/cnxsy77/Todododo.git`
- 代理仅对 github.com 生效，内网仓库不受影响。
- VPN 关闭时，仅 GitHub 相关 git 操作会受影响。
