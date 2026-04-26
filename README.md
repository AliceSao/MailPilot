# MailPilot

Outlook 邮箱批量管理系统 / Outlookメール一括管理システム

## 功能一览

**账户管理** — 导入/导出/删除/搜索/分组/分页  
**令牌检测** — Graph API + IMAP 双通道自动检测  
**令牌续期** — 手动续期（单个/批量），倒数3天自动续期  
**邮件查看** — 收件箱/垃圾箱，5分钟缓存  
**验证码提取** — API 自动从邮件中提取数字验证码  
**多语言** — 中文 / 日本語  
**多主题** — 亮色 / 暗色 / 星空 / 黄昏  
**多平台** — Windows / Android / Python 源码

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

## 导入格式

支持两种格式，分隔符 `----`：
```
邮箱----密码----客户端ID----刷新令牌    （完整，支持全部功能）
邮箱----密码                              （仅账密，无令牌功能）
```

## 项目结构

```
app.py              后端主服务（FastAPI）
api.py              对外开放 API（批量操作/验证码提取）
requirements.txt    依赖
static/
  index.html        页面
  style.css         样式
  app.js            前端逻辑
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
- 系统不自动续期（除首次导入和倒数3天），其余需用户手动操作
- 支持两种 scope：Graph API (Mail.ReadWrite) 和 IMAP (IMAP.AccessAsUser.All)

## 使用教程

详见 [TUTORIAL.txt](TUTORIAL.txt)

## License

MIT
