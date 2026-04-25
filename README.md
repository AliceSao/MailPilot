# MailPilot

轻量级 Outlook 邮箱管理系统，支持批量管理、令牌自动续期、邮件查看。

## 功能

- **邮箱管理** — 导入/导出、搜索、分组、分页、批量操作
- **令牌检测** — 通过 Microsoft Graph API 验证令牌有效性
- **令牌续期** — 手动续期 refresh_token（每次续期获得新的 90 天有效期）
- **到期预警** — 令牌有效期倒计时，≤10 天自动提醒
- **邮件查看** — 收件箱 / 垃圾邮件，左右分栏布局
- **数据持久化** — 服务端 JSON + CSV 存储
- **深色模式** — 全局深色/浅色切换

## 快速开始

### Windows

双击运行 `dist/windows/MailPilot.exe`，浏览器自动打开。

### Linux / macOS

```bash
pip install -r requirements.txt
python app.py
```

浏览器打开 `http://127.0.0.1:1375`

### Android

使用 Android Studio 打开 `android/` 目录，构建 APK 安装到手机。  
手机与运行后端的电脑需在同一局域网。

## 导入格式

```
邮箱----密码----客户端ID----刷新令牌
```

每行一个账户，分隔符为 `----`。

## 令牌续期说明

Microsoft OAuth2 的 refresh_token 默认 90 天有效。每次使用旧 token 换取新 token 时，微软会同时返回一个**新的 refresh_token**（新的 90 天有效期），旧 token 立即作废。

本系统**不会自动续期**。用户需要通过以下方式手动操作：

- 表格中每行的 🔄 续期按钮
- 工具栏的「批量续期」按钮

续期前后建议导出备份。

## 项目结构

```
app.py                → 后端 (FastAPI, ~200行)
requirements.txt      → Python 依赖
static/
  index.html          → 页面结构
  style.css           → 样式
  app.js              → 前端逻辑
android/              → Android WebView 项目
dist/
  windows/
    MailPilot.exe     → Windows 可执行文件
output/               → 运行时数据 (自动创建)
  accounts.json       → 账户数据
  accounts.csv        → CSV 备份
  groups.json         → 分组数据
```

## 技术栈

- **后端**: Python / FastAPI / httpx
- **前端**: Vanilla JS / Font Awesome
- **API**: Microsoft Graph API v1.0
- **移动端**: Android WebView

## License

MIT
