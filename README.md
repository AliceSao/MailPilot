# MailPilot

Outlook 邮箱批量管理系统

## 功能一览

| 功能 | 说明 |
|------|------|
| 账户管理 | 导入/导出/删除/搜索/分组/分页 |
| 令牌检测 | Graph API + IMAP 双通道（单个/批量/全量） |
| 令牌续期 | 手动续期（单个/批量），无自动续期 |
| 邮件查看 | 收件箱/垃圾箱，5分钟缓存，iframe 安全渲染 |
| 验证码提取 | API 自动从邮件中提取数字验证码 |
| 批量操作 | 统一选择弹窗（选中/全部/取消） |
| 多语言 | 中文 / 日本語 |
| 多主题 | 亮色 / 暗色 / 星空 / 黄昏 |
| 多平台 | Windows (Java) / Android (Java) |

## 快速开始

### Windows（源码运行）

**前置条件**：JDK 21+（[下载](https://adoptium.net/)）

```batch
:: 方式一：根目录一键启动（自动编译 + 启动 + 打开浏览器）
start.bat

:: 方式二：进入 pc 目录启动
cd pc
start.bat

:: 强制重新编译
start.bat -recompile

:: 指定端口
start.bat 9375
```

启动后浏览器自动打开 `http://localhost:1375`

### Android

1. 用 Android Studio 打开 `android/` 目录
2. 同步 Gradle 依赖
3. 连接设备或模拟器，点击 Run

### 编译（仅 PC）

```batch
cd pc
compile.bat
```

编译输出到 `pc/out/`，依赖库在 `pc/lib/`。

## 端口问题

默认端口 `1375`，如果启动报端口占用：

**方法一：指定其他端口**
```batch
start.bat 9375
```

**方法二：释放被占用的端口**（管理员 PowerShell）
```powershell
netsh int ipv4 show excludedportrange protocol=tcp
netsh int ipv4 set dynamic tcp start=49152 num=16384
net stop winnat && net start winnat
```

## 导入格式

分隔符 `----`，支持两种格式：
```
邮箱----密码----客户端ID----刷新令牌    （完整，支持全部功能）
邮箱----密码                              （仅账密，无令牌功能）
```

## 项目结构

```
pc/                         PC 版（Java，JDK HttpServer）
  src/                      Java 源码
    Main.java               启动入口
    PcServer.java           HTTP 路由
    MailService.java        邮件服务（Graph + IMAP）
    AccountService.java     账号数据管理
    BatchService.java       批量操作
    CsvService.java         CSV 解析
    SecurityService.java    安全服务
    StaticFileHandler.java  静态文件服务
  static/                   前端（HTML/CSS/JS，PC 与 Android 共用）
  lib/                      依赖 JAR
  compile.bat               编译脚本
  start.bat                 启动脚本

android/                    Android 版（Java，NanoHTTPD）
  app/src/main/
    java/.../LocalServer.java   后端逻辑
    java/.../MainActivity.java  Activity
    assets/static/              前端（与 PC 共用）

docs/                       文档
  explain/                   公开文档
  inside/                    内部文档
  exploitation/              开发报告
  skill/                     Skill 定义

output/                      运行时数据（gitignore）
```

## 令牌说明

- Microsoft refresh_token 有效期 90 天
- 每次续期获得新 token（新 90 天），旧 token 立即失效
- **系统不自动续期**，所有续期操作由用户手动触发
- 未手动续期的邮箱，有效期显示"未知"
- 支持两种 scope：Graph API (Mail.ReadWrite) 和 IMAP (IMAP.AccessAsUser.All)
- 到期前 ≤10 天自动弹出预警提示

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/accounts` | GET/POST | 获取/管理账号列表 |
| `/api/groups` | GET/POST | 获取/管理分组 |
| `/api/mail-all` | GET/POST | 查询邮件 |
| `/api/renew-token` | POST | 续期令牌 |
| `/api/check-single` | POST | 单账号令牌验证 |
| `/api/batch-check` | POST | 批量令牌检测 |
| `/api/batch-renew` | POST | 批量令牌续期 |
| `/api/batch-delete` | POST | 批量删除 |
| `/api/extract-code` | GET/POST | 验证码提取 |
| `/api/export` | GET | 导出全部 |
| `/api/export-selected` | POST | 导出选中 |
| `/api/import` | POST | 导入 |

## License

MIT