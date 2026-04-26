# MailPilot

Outlook 邮箱批量管理系统 / Outlookメール一括管理システム

## 功能一览

**账户管理** — 导入/导出/删除/搜索/分组/分页  
**令牌检测** — Graph API + IMAP 双通道（单个/批量/全量）  
**令牌续期** — 手动续期（单个/批量），无自动续期  
**邮件查看** — 收件箱/垃圾箱，5分钟缓存，iframe 安全渲染  
**验证码提取** — API 自动从邮件中提取数字验证码  
**批量操作** — 统一选择弹窗（选中/全部/取消）  
**多语言** — 中文 / 日本語  
**多主题** — 亮色 / 暗色 / 星空 / 黄昏  
**多平台** — Windows / Android / Python 源码  
**安全** — 邮件 XSS 防护，数据自动备份，127.0.0.1 绑定

## 快速开始

### Windows
双击 `dist/windows/MailPilot.exe`

### Android
安装 `dist/android/MailPilot.apk`

### 源码运行
```bash
pip install -r requirements.txt
python app.py
```
浏览器自动打开 `http://127.0.0.1:1375`

## 端口问题

默认端口为 `1375`，如果启动时遇到以下错误：

```
[Errno 13] [WinError 10013] 以一种访问权限不允许的方式做了一个访问套接字的尝试。
```

这通常是 Windows 的 Hyper-V / WSL 动态端口保留机制将 1375 占用导致的。

### 方法一：修改端口（推荐）

打开 `app.py`，找到底部启动代码（约第 531 行），将 `1375` 改为其他端口（如 `9375`）：

```python
if __name__ == "__main__":
    threading.Timer(1.5, lambda: webbrowser.open("http://127.0.0.1:9375")).start()
    try:
        uvicorn.run(app, host="127.0.0.1", port=9375, log_level="info")
```

> 建议选择 `8000-9999` 或 `49152-65535` 范围内的端口，避开系统保留区。

### 方法二：释放被占用的端口

以**管理员身份**打开 PowerShell，执行以下命令：

```powershell
# 1. 查看当前被排除的端口范围
netsh int ipv4 show excludedportrange protocol=tcp

# 2. 将 Windows 动态端口范围改为高位（避免占用低位端口）
netsh int ipv4 set dynamic tcp start=49152 num=16384

# 3. 重启 WinNAT 服务使其立即生效
net stop winnat
net start winnat

# 4. 验证 1375 不再被排除
netsh int ipv4 show excludedportrange protocol=tcp
```

如果端口被其他进程占用（错误码 `10048`），可查找并终止该进程：

```powershell
# 查找占用 1375 的进程
netstat -ano | findstr ":1375"

# 终止对应 PID 的进程（将 <PID> 替换为实际进程号）
taskkill /F /PID <PID>
```

## 导入格式

支持两种格式，分隔符 `----`：
```
邮箱----密码----客户端ID----刷新令牌    （完整，支持全部功能）
邮箱----密码                              （仅账密，无令牌功能）
```

## 项目结构

```
app.py              后端主服务（FastAPI，内部API）
api.py              对外开放 API（批量操作/验证码提取）
requirements.txt    依赖
static/
  index.html        页面
  style.css         样式（含移动端卡片布局 + 4套主题）
  app.js            前端逻辑（i18n + 批量操作 + 邮件缓存）
android/            Android 项目源码
dist/
  windows/          MailPilot.exe
  android/          MailPilot.apk
```

## API

详见 [API.md](API.md)

## 令牌说明

- Microsoft refresh_token 有效期 90 天
- 每次续期获得新 token（新 90 天），旧 token 立即失效
- **系统不自动续期**，所有续期操作由用户手动触发
- 未手动续期的邮箱，有效期显示"未知"
- 支持两种 scope：Graph API (Mail.ReadWrite) 和 IMAP (IMAP.AccessAsUser.All)
- 到期前 ≤10 天自动弹出预警提示

## 安全特性

- 邮件 HTML 通过 iframe sandbox 隔离渲染（防 XSS）
- POST /api/accounts 写入前自动备份 accounts.json.bak
- 默认绑定 127.0.0.1（不暴露到局域网）
- syncToBackend 100ms 节流（防止批量操作频繁写入）
- POST 接口有 list 类型校验

## 使用教程

详见 [TUTORIAL.txt](TUTORIAL.txt)

## License

MIT
