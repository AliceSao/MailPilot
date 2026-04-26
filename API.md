# MailPilot API 文档

基础地址：`http://127.0.0.1:1375`

---

## 对外开放 API

以下接口可供外部程序、脚本、自动化工具调用。

### POST /api/batch-check
批量检测令牌状态。

**请求体：**
```json
{"emails": ["user1@outlook.com", "user2@outlook.com"]}
```
或检测全部：
```json
{"all": true}
```

**响应：**
```json
{
  "checked": 2,
  "results": [
    {"email": "user1@outlook.com", "status": "valid"},
    {"email": "user2@outlook.com", "status": "invalid", "error": "oauth failed"}
  ]
}
```

---

### POST /api/batch-renew
批量续期令牌。续期后旧 token 失效。

**请求体：**
```json
{"emails": ["user1@outlook.com"]}
```
或续期全部：
```json
{"all": true}
```

**响应：**
```json
{
  "renewed": 1,
  "failed": 0,
  "results": [{"email": "user1@outlook.com", "success": true}]
}
```

---

### POST /api/batch-delete
批量删除账户。

**请求体：**
```json
{"emails": ["user1@outlook.com", "user2@outlook.com"]}
```

**响应：**
```json
{"deleted": 2, "remaining": 98}
```

---

### GET /api/copy-emails
获取邮箱/密码数据。

**参数：**
| 参数 | 说明 | 示例 |
|------|------|------|
| type | email / password / both / full | `type=email` |
| emails | 逗号分隔，留空=全部 | `emails=a@outlook.com,b@outlook.com` |

**响应：**
```json
{"count": 2, "data": "a@outlook.com\nb@outlook.com"}
```

---

### GET /api/extract-code
从邮件中提取验证码。

**参数：**
| 参数 | 必填 | 说明 |
|------|:----:|------|
| email | 是 | 邮箱地址 |
| client_id | 是 | 客户端ID |
| refresh_token | 是 | 刷新令牌 |
| keyword | 否 | 过滤关键字（如 `JetBrains`、`verification`） |
| pattern | 否 | 正则表达式（默认 `\b\d{4,8}\b` 匹配4-8位数字） |

**响应（找到）：**
```json
{
  "found": true,
  "email": "user@outlook.com",
  "latest_code": "123456",
  "results": [
    {
      "email": "user@outlook.com",
      "subject": "Your verification code",
      "sender": "noreply@example.com",
      "date": "2026-04-26T12:00:00Z",
      "codes": ["123456"]
    }
  ]
}
```

**响应（未找到）：**
```json
{"found": false, "email": "user@outlook.com", "message": "No verification code found"}
```

**使用示例：**
```bash
# 获取 JetBrains 验证码
curl "http://127.0.0.1:1375/api/extract-code?email=user@outlook.com&client_id=xxx&refresh_token=xxx&keyword=JetBrains"

# 获取6位数验证码
curl "http://127.0.0.1:1375/api/extract-code?email=user@outlook.com&client_id=xxx&refresh_token=xxx&pattern=\b\d{6}\b"
```

---

## 内部 API

以下接口供前端页面使用，不建议外部直接调用。

| 路径 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 首页 |
| `/api/mail-all` | GET | 读取邮件（Graph + IMAP 双通道） |
| `/api/renew-token` | POST | 单个令牌续期 |
| `/api/accounts` | GET | 获取全部账户数据 |
| `/api/accounts` | POST | 保存全部账户数据 |
| `/api/groups` | GET | 获取分组列表 |
| `/api/groups` | POST | 保存分组列表 |
| `/api/import` | POST | 文件导入（multipart） |
| `/api/export` | GET | 导出全部为 txt 文件 |
