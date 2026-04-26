# MailPilot API 文档

基础地址：`http://127.0.0.1:1375`

---

## 对外开放 API（api.py）

### POST /api/batch-check
批量检测令牌状态。

```json
// 请求
{"emails": ["user1@outlook.com"]}
// 或全部
{"all": true}

// 响应
{"checked": 1, "results": [{"email": "...", "status": "valid"}]}
```

### POST /api/batch-renew
批量续期令牌。**续期后旧 token 立即失效。**

```json
// 请求
{"emails": ["user1@outlook.com"]}
// 或全部
{"all": true}

// 响应
{"renewed": 1, "failed": 0, "results": [{"email": "...", "success": true}]}
```

### POST /api/batch-delete
批量删除账户。

```json
// 请求
{"emails": ["user1@outlook.com"]}

// 响应
{"deleted": 1, "remaining": 99}
```

### GET /api/copy-emails
获取邮箱/密码数据。

| 参数 | 说明 | 示例 |
|------|------|------|
| type | email / password / both / full | `type=email` |
| emails | 逗号分隔，留空=全部 | `emails=a@outlook.com` |

```json
// 响应
{"count": 1, "data": "a@outlook.com"}
```

### GET /api/extract-code
从邮件中提取验证码。

| 参数 | 必填 | 说明 |
|------|:----:|------|
| email | 是 | 邮箱地址 |
| client_id | 是 | 客户端ID |
| refresh_token | 是 | 刷新令牌 |
| keyword | 否 | 过滤关键字 |
| pattern | 否 | 正则（默认 `\b\d{4,8}\b`） |

```json
// 响应（找到）
{"found": true, "email": "...", "latest_code": "123456", "results": [...]}

// 响应（未找到）
{"found": false, "email": "...", "message": "No verification code found"}
```

```bash
# 示例：获取 JetBrains 验证码
curl "http://127.0.0.1:1375/api/extract-code?email=xxx&client_id=xxx&refresh_token=xxx&keyword=JetBrains"
```

---

## 内部 API（app.py）

| 路径 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 首页 |
| `/api/mail-all` | GET | 读取邮件（Graph + IMAP 双通道） |
| `/api/renew-token` | POST | 单个令牌续期 |
| `/api/accounts` | GET | 获取全部账户（带自动备份） |
| `/api/accounts` | POST | 保存账户（list 校验 + .bak 备份） |
| `/api/groups` | GET | 获取分组列表 |
| `/api/groups` | POST | 保存分组（list 校验） |
| `/api/import` | POST | 文件导入（multipart，支持 BOM） |
| `/api/export` | GET | 导出全部为 txt |
