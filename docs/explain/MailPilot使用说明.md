# MailPilot 使用说明

Outlook 邮箱批量管理系统

---

## 一、功能介绍

### 账户管理
- 批量导入/导出邮箱账号
- 分组管理、搜索、分页浏览
- 支持两种导入格式（详见下方）

### 令牌管理
- **检测**：验证令牌是否有效（Graph API + IMAP 双通道）
- **续期**：手动续期令牌（单个/批量）
- **有效期**：90天倒计时显示，≤10天弹出预警

### 邮件查看
- 收件箱/垃圾箱切换
- 5分钟智能缓存
- 安全渲染（iframe 沙箱隔离）

### 验证码提取
- API 自动从邮件中提取数字验证码
- 支持关键词过滤

### 批量操作
- 统一选择弹窗：选中 / 全部 / 取消
- 批量检测、续期、复制、删除、导出

### 个性化
- 多语言：中文 / 日本語
- 多主题：亮色 / 暗色 / 星空 / 黄昏

---

## 二、安装与启动

### Windows

**前置条件**：JDK 21 或更高版本

```batch
:: 一键启动（自动编译 + 启动 + 打开浏览器）
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

---

## 三、导入格式

分隔符为 `----`，支持两种格式：

```
邮箱----密码----客户端ID----刷新令牌    （完整格式，支持全部功能）
邮箱----密码                              （仅账密，无令牌功能）
```

示例：
```
user@outlook.com----MyPassword----client-id-here----refresh-token-here
user@outlook.com----MyPassword
```

---

## 四、使用流程

### 1. 导入邮箱
点击「导入邮箱」→ 选择「文本输入」或「文件导入」→ 确认导入

### 2. 检测令牌
- 单个：点击每行的 🔍 按钮
- 批量：工具栏「批量检测」→ 选择范围

### 3. 续期令牌
- 单个：点击每行的 🔄 按钮
- 批量：工具栏「批量续期」→ 选择范围
- 令牌剩余 ≤3 天时页面加载自动续期

### 4. 查看邮件
点击「查看」→ 左侧邮件列表 → 右侧邮件内容 → 可切换收件箱/垃圾箱

### 5. 导出备份
点击「导出备份」→ 选择导出范围 → 下载文件

> ⚠️ 续期/删除前务必先导出备份！

---

## 五、API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/accounts` | GET | 获取账号列表 |
| `/api/accounts` | POST | 管理账号（增删改） |
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

常用示例：
```bash
# 批量检测全部
curl -X POST http://127.0.0.1:1375/api/batch-check -H "Content-Type: application/json" -d "{\"all\":true}"

# 提取验证码
curl "http://127.0.0.1:1375/api/extract-code?email=xxx@outlook.com&client_id=xxx&refresh_token=xxx&keyword=JetBrains"

# 导出全部邮箱
curl http://127.0.0.1:1375/api/export?type=email
```

---

## 六、令牌说明

- Microsoft refresh_token 有效期 **90 天**
- 每次续期获得新 token（新 90 天），旧 token 立即失效
- **系统不自动续期**，所有续期操作由用户手动触发
- 未手动续期的邮箱，有效期显示"未知"
- 支持两种 scope：Graph API (`Mail.ReadWrite`) 和 IMAP (`IMAP.AccessAsUser.All`)

---

## 七、端口问题

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

---

## 八、项目结构

```
pc/                         PC 版
  src/                      Java 源码
  static/                   前端（HTML/CSS/JS，PC 与 Android 共用）
  lib/                      依赖 JAR
  compile.bat               编译脚本
  start.bat                 启动脚本

android/                    Android 版
  app/src/main/             Java 源码 + 前端资源

docs/                       文档
```

---

## License

MIT