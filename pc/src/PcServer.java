import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import java.io.*;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

public class PcServer {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final String STATIC_DIR = "static";
    private static final String OUTPUT_DIR = "output";
    private static final String LOG_DIR = OUTPUT_DIR + "/log";
    private static final String ACCOUNTS_FILE = OUTPUT_DIR + "/accounts.json";
    private static final String GROUPS_FILE = OUTPUT_DIR + "/groups.json";

    private final MailService mailService;
    private final AccountService accountService;
    private final BatchService batchService;
    private final CsvService csvService;
    private final StaticFileHandler staticHandler;
    private final SecurityService securityService;

    private PrintWriter logWriter;
    private String currentLogFile;
    private final Object logLock = new Object();

    public PcServer() {
        new File(OUTPUT_DIR).mkdirs();
        initLogger();
        this.mailService = new MailService();
        this.accountService = new AccountService(ACCOUNTS_FILE);
        this.batchService = new BatchService(mailService, accountService);
        this.csvService = new CsvService();
        this.staticHandler = new StaticFileHandler(STATIC_DIR);
        this.securityService = new SecurityService();
        log("INFO", "安全服务初始化: " + (securityService.isEnabled() ? "已启用" : "未启用"));
    }

    private void initLogger() {
        try {
            new File(LOG_DIR).mkdirs();

            // 清理7天前的旧日志文件
            cleanOldLogs();

            String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(new Date());
            currentLogFile = LOG_DIR + "/mailpilot_" + timestamp + ".log";
            logWriter = new PrintWriter(
                new OutputStreamWriter(new FileOutputStream(currentLogFile), StandardCharsets.UTF_8),
                true
            );
            log("INFO", "日志系统初始化完成: " + currentLogFile);
        } catch (Exception e) {
            System.err.println("[错误] 日志初始化失败: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void cleanOldLogs() {
        File logDir = new File(LOG_DIR);
        if (!logDir.exists()) return;
        long cutoff = System.currentTimeMillis() - 7L * 24 * 60 * 60 * 1000;
        File[] oldLogs = logDir.listFiles((dir, name) ->
                name.startsWith("mailpilot_") && name.endsWith(".log"));
        if (oldLogs != null) {
            int cleaned = 0;
            for (File f : oldLogs) {
                if (f.lastModified() < cutoff) {
                    if (f.delete()) cleaned++;
                }
            }
            if (cleaned > 0) {
                System.out.println("[INFO] 已清理 " + cleaned + " 个过期日志文件（>7天）");
            }
        }
    }

    public void log(String level, String message) {
        synchronized (logLock) {
            if (logWriter == null) return;
            String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
            String logLine = String.format("[%s] [%s] [%s] %s", timestamp, level, Thread.currentThread().getName(), message);
            logWriter.println(logLine);
            System.out.println(logLine);
        }
    }

    public void logRequest(String method, String path, int statusCode, long durationMs) {
        String message = String.format("%s %s → %d (%dms)", method, path, statusCode, durationMs);
        if (statusCode >= 400) {
            log("WARN", message);
        } else {
            log("INFO", message);
        }
    }

    public void closeLogger() {
        synchronized (logLock) {
            if (logWriter != null) {
                log("INFO", "日志系统关闭");
                logWriter.close();
                logWriter = null;
            }
        }
    }

    public String getCurrentLogFile() {
        return currentLogFile;
    }

    public void handle(HttpExchange exchange) throws IOException {
        long startTime = System.currentTimeMillis();
        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        addCorsHeaders(exchange);

        if ("OPTIONS".equalsIgnoreCase(method)) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (path.startsWith("/api/") && !securityService.checkRateLimit(exchange)) {
            sendError(exchange, 429, "请求过于频繁，请稍后再试");
            return;
        }

        if (securityService.isProtected() && path.startsWith("/api/")) {
            if (!path.equals("/api/login") && !path.equals("/api/security/status")) {
                if (!securityService.isRequestAuthenticated(exchange)) {
                    sendError(exchange, 401, "需要登录");
                    return;
                }
            }
        }

        int statusCode = 200;
        try {
            if (path.startsWith("/api/")) {
                handleApi(exchange, method, path);
            } else {
                staticHandler.serve(exchange, path);
            }
        } catch (Exception e) {
            statusCode = 500;
            log("ERROR", "请求处理异常: " + method + " " + path + " - " + e.getMessage());
            if (logWriter != null) {
                e.printStackTrace(logWriter);
            } else {
                e.printStackTrace(System.err);
            }
            sendError(exchange, 500, e.getMessage());
        }

        long durationMs = System.currentTimeMillis() - startTime;
        if (!path.contains("/static/") && !path.endsWith(".js") && !path.endsWith(".css") && !path.endsWith(".png")) {
            logRequest(method, path, statusCode, durationMs);
        }
    }

    private void handleApi(HttpExchange exchange, String method, String path) throws Exception {
        switch (path) {
            case "/api/accounts":
                if ("GET".equalsIgnoreCase(method)) {
                    handleGetAccounts(exchange);
                } else if ("POST".equalsIgnoreCase(method)) {
                    handleSaveAccounts(exchange);
                }
                break;
            case "/api/groups":
                if ("GET".equalsIgnoreCase(method)) {
                    handleGetGroups(exchange);
                } else if ("POST".equalsIgnoreCase(method)) {
                    handleSaveGroups(exchange);
                }
                break;
            case "/api/mail-all":
                if ("GET".equalsIgnoreCase(method) || "POST".equalsIgnoreCase(method)) {
                    handleMailAll(exchange);
                }
                break;
            case "/api/renew-token":
                if ("POST".equalsIgnoreCase(method)) {
                    handleRenewToken(exchange);
                }
                break;
            case "/api/check-single":
                if ("POST".equalsIgnoreCase(method)) {
                    handleCheckSingle(exchange);
                }
                break;
            case "/api/batch-check":
                if ("POST".equalsIgnoreCase(method)) {
                    handleBatchCheck(exchange);
                }
                break;
            case "/api/batch-renew":
                if ("POST".equalsIgnoreCase(method)) {
                    handleBatchRenew(exchange);
                }
                break;
            case "/api/batch-delete":
                if ("POST".equalsIgnoreCase(method)) {
                    handleBatchDelete(exchange);
                }
                break;
            case "/api/import":
                if ("POST".equalsIgnoreCase(method)) {
                    handleImport(exchange);
                }
                break;
            case "/api/export":
                if ("GET".equalsIgnoreCase(method)) {
                    handleExport(exchange);
                }
                break;
            case "/api/export-selected":
                if ("POST".equalsIgnoreCase(method)) {
                    handleExportSelected(exchange);
                }
                break;
            case "/api/extract-code":
                if ("GET".equalsIgnoreCase(method) || "POST".equalsIgnoreCase(method)) {
                    handleExtractCode(exchange);
                }
                break;
            case "/api/login":
                if ("POST".equalsIgnoreCase(method)) {
                    handleLogin(exchange);
                }
                break;
            case "/api/logout":
                if ("POST".equalsIgnoreCase(method)) {
                    handleLogout(exchange);
                }
                break;
            case "/api/security/status":
                handleSecurityStatus(exchange);
                break;
            case "/api/security/set-password":
                if ("POST".equalsIgnoreCase(method)) {
                    handleSetPassword(exchange);
                }
                break;
            case "/api/security/remove-password":
                if ("POST".equalsIgnoreCase(method)) {
                    handleRemovePassword(exchange);
                }
                break;
            default:
                sendError(exchange, 404, "API not found");
        }
    }

    private void handleGetAccounts(HttpExchange exchange) throws IOException {
        List<Map<String, String>> accounts = accountService.loadAccounts();
        // 为每个账号计算到期天数和到期等级（业务逻辑下沉到后端）
        List<Map<String, Object>> enriched = new ArrayList<>();
        for (Map<String, String> acc : accounts) {
            Map<String, Object> item = new LinkedHashMap<>(acc);
            int daysRemaining = calcDaysRemaining(acc.get("tokenRenewedAt"));
            item.put("daysRemaining", daysRemaining);
            item.put("expiryClass", calcExpiryClass(daysRemaining));
            enriched.add(item);
        }
        sendSuccess(exchange, enriched);
    }

    // Token有效期（可通过环境变量 TOKEN_LIFETIME_DAYS 配置，默认90天）
    private static final int TOKEN_LIFETIME_DAYS = Integer.getInteger("TOKEN_LIFETIME_DAYS", 90);

    public static int calcDaysRemaining(String tokenRenewedAt) {
        if (tokenRenewedAt == null || tokenRenewedAt.isEmpty()) return -1;
        try {
            java.time.Instant renewed = java.time.Instant.parse(tokenRenewedAt);
            java.time.Instant expiry = renewed.plus(java.time.Duration.ofDays(TOKEN_LIFETIME_DAYS));
            long diffMs = java.time.Duration.between(java.time.Instant.now(), expiry).toMillis();
            return (int) Math.ceil((double) diffMs / (24 * 60 * 60 * 1000));
        } catch (Exception e) {
            return -1;
        }
    }

    // 计算到期等级CSS类名
    public static String calcExpiryClass(int days) {
        if (days < 0) return "";
        if (days <= 3) return "expiry-critical";
        if (days <= 5) return "expiry-danger";
        if (days <= 10) return "expiry-warning";
        if (days <= 45) return "expiry-notice";
        return "expiry-ok";
    }

    private void handleSaveAccounts(HttpExchange exchange) throws IOException {
        String body = readBody(exchange);
        boolean saved = accountService.saveAccounts(body);
        if (!saved) {
            sendError(exchange, 400, "拒绝空数组覆写，请确认操作意图");
            return;
        }
        sendSuccess(exchange, true);
    }

    private void handleMailAll(HttpExchange exchange) throws Exception {
        String method = exchange.getRequestMethod();
        String email, clientId, refreshToken, mailbox, password, permissionType;

        if ("POST".equalsIgnoreCase(method)) {
            String body = readBody(exchange);
            java.lang.reflect.Type mapType = new com.google.gson.reflect.TypeToken<Map<String, String>>(){}.getType();
            Map<String, String> params = GSON.fromJson(body, mapType);
            if (params == null) params = new java.util.LinkedHashMap<>();
            email = params.getOrDefault("email", "");
            clientId = params.getOrDefault("clientId", "");
            refreshToken = params.getOrDefault("refreshToken", "");
            mailbox = params.getOrDefault("mailbox", "INBOX");
            password = params.getOrDefault("password", "");
            permissionType = params.getOrDefault("permissionType", "");
        } else {
            Map<String, String> params = parseQueryParams(exchange);
            email = params.get("email");
            clientId = params.get("client_id");
            refreshToken = params.get("refresh_token");
            mailbox = params.getOrDefault("mailbox", "INBOX");
            password = params.getOrDefault("password", "");
            permissionType = params.getOrDefault("permission_type", "");
        }

        if (email == null || email.isEmpty() || clientId == null || clientId.isEmpty() || refreshToken == null || refreshToken.isEmpty()) {
            sendError(exchange, 400, "缺少必要参数: email, clientId, refreshToken");
            return;
        }

        try {
            List<Map<String, String>> mails = mailService.fetchMails(email, clientId, refreshToken, mailbox, password, permissionType);

            log("INFO", "邮件查询成功: " + email + " - 获取到 " + mails.size() + " 封邮件");

            // 使用标准 {code, data, message} 响应格式
            sendSuccess(exchange, mails);
        } catch (MailService.AuthException e) {
            log("ERROR", "邮件查询认证失败: " + e.getMessage());
            sendError(exchange, 401, "认证失败: " + e.getMessage());
        } catch (Exception e) {
            log("ERROR", "邮件查询异常: " + e.getMessage());
            sendError(exchange, 500, e.getMessage());
        }
    }

    private void handleBatchCheck(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        List<Map<String, String>> accounts = GSON.fromJson(body,
                new TypeToken<List<Map<String, String>>>(){}.getType());
        if (accounts == null || accounts.isEmpty()) {
            sendError(exchange, 400, "账号列表不能为空");
            return;
        }
        List<Map<String, Object>> results = batchService.checkTokens(accounts);
        sendSuccess(exchange, results);
    }

    private void handleCheckSingle(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        Map<String, String> req = GSON.fromJson(body, new TypeToken<Map<String, String>>(){}.getType());
        String email = req.getOrDefault("email", "");
        String clientId = req.getOrDefault("clientId", "");
        String refreshToken = req.getOrDefault("refreshToken", "");
        String password = req.getOrDefault("password", "");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("email", email);

        if (clientId == null || refreshToken == null || clientId.isEmpty() || refreshToken.isEmpty()) {
            result.put("status", "invalid");
            result.put("error", "缺少clientId或refreshToken");
            result.put("tokenStatus", "invalid");
            sendSuccess(exchange, result);
            return;
        }

        try {
            Map<String, String> tokens = mailService.obtainTokens(clientId, refreshToken);
            if (tokens == null) {
                result.put("status", "invalid");
                result.put("error", "OAuth2 token exchange failed");
                result.put("tokenStatus", "invalid");
            } else {
                String accessToken = tokens.get("access_token");
                // 先Graph验证，失败则IMAP降级验证（XOAUTH2→密码）
                boolean graphOk = mailService.verifyAccessToken(accessToken);
                boolean imapOk = !graphOk && mailService.verifyImapWithPassword(email, accessToken, password);
                boolean mailOk = graphOk || imapOk;
                if (mailOk) {
                    result.put("status", "valid");
                    result.put("tokenStatus", "valid");
                    result.put("permissionType", graphOk ? "O2" : "IMAP");
                } else {
                    result.put("status", "invalid");
                    result.put("error", "Token valid but mail access denied");
                    result.put("tokenStatus", "invalid");
                }
            }
        } catch (Exception e) {
            result.put("status", "invalid");
            result.put("error", e.getMessage());
            result.put("tokenStatus", "invalid");
        }

        sendSuccess(exchange, result);
    }

    private void handleBatchRenew(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        List<Map<String, String>> accounts = GSON.fromJson(body,
                new TypeToken<List<Map<String, String>>>(){}.getType());
        if (accounts == null || accounts.isEmpty()) {
            sendError(exchange, 400, "账号列表不能为空");
            return;
        }
        List<Map<String, Object>> results = batchService.renewTokens(accounts);
        sendSuccess(exchange, results);
    }

    private void handleBatchDelete(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        List<Map<String, String>> accounts = GSON.fromJson(body,
                new TypeToken<List<Map<String, String>>>(){}.getType());
        if (accounts == null || accounts.isEmpty()) {
            sendError(exchange, 400, "账号列表不能为空");
            return;
        }
        List<Map<String, Object>> results = batchService.deleteAccounts(accounts);
        sendSuccess(exchange, results);
    }

    private void handleImport(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        String text;

        try {
            Map<String, String> req = GSON.fromJson(body, new TypeToken<Map<String, String>>(){}.getType());
            text = req.getOrDefault("content", body);
        } catch (Exception e) {
            text = body;
        }

        List<Map<String, String>> existing = accountService.loadAccounts();
        Set<String> existingEmails = new LinkedHashSet<>();
        for (Map<String, String> a : existing) {
            String email = a.get("email");
            if (email != null) existingEmails.add(email.toLowerCase());
        }

        String[] lines = text.split("\\r?\\n");
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;
            String[] parts = line.split("----");
            if (parts.length < 4) continue;

            String email = parts[0].trim();
            if (existingEmails.contains(email.toLowerCase())) continue;

            existingEmails.add(email.toLowerCase());
            Map<String, String> account = new LinkedHashMap<>();
            account.put("email", email);
            account.put("password", parts[1].trim());
            account.put("clientId", parts[2].trim());
            account.put("refreshToken", parts[3].trim());
            account.put("group", "未分组");
            account.put("tokenStatus", "");
            account.put("permissionType", "");
            existing.add(account);
        }

        accountService.saveAccountsList(existing);
        sendSuccess(exchange, existing);
    }

    private void handleExport(HttpExchange exchange) throws IOException {
        List<Map<String, String>> accounts = accountService.loadAccounts();
        if (accounts.isEmpty()) {
            sendError(exchange, 404, "无数据可导出");
            return;
        }
        StringBuilder sb = new StringBuilder();
        for (Map<String, String> acc : accounts) {
            String email = acc.getOrDefault("email", "");
            String password = acc.getOrDefault("password", "");
            String clientId = acc.getOrDefault("clientId", "");
            String refreshToken = acc.getOrDefault("refreshToken", "");
            sb.append(email).append("----")
                    .append(password).append("----")
                    .append(clientId).append("----")
                    .append(refreshToken).append("\n");
        }

        String content = sb.toString();
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);

        String dateStr = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmmss"));
        String filename = "邮箱列表_" + dateStr + ".txt";
        String encodedFilename = java.net.URLEncoder.encode(filename, StandardCharsets.UTF_8)
                .replace("+", "%20");

        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.getResponseHeaders().set("Content-Disposition",
                "attachment; filename*=UTF-8''" + encodedFilename);
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.getResponseBody().close();
    }

    private void handleExportSelected(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        List<Map<String, String>> selected = GSON.fromJson(body,
                new TypeToken<List<Map<String, String>>>(){}.getType());
        if (selected == null || selected.isEmpty()) {
            sendError(exchange, 400, "无选中数据可导出");
            return;
        }
        StringBuilder sb = new StringBuilder();
        for (Map<String, String> acc : selected) {
            String email = acc.getOrDefault("email", "");
            String password = acc.getOrDefault("password", "");
            String clientId = acc.getOrDefault("clientId", "");
            String refreshToken = acc.getOrDefault("refreshToken", "");
            sb.append(email).append("----")
                    .append(password).append("----")
                    .append(clientId).append("----")
                    .append(refreshToken).append("\n");
        }

        String content = sb.toString();
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);

        String dateStr = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmmss"));
        String filename = "邮箱列表_选中_" + dateStr + ".txt";
        String encodedFilename = java.net.URLEncoder.encode(filename, StandardCharsets.UTF_8)
                .replace("+", "%20");

        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.getResponseHeaders().set("Content-Disposition",
                "attachment; filename*=UTF-8''" + encodedFilename);
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.getResponseBody().close();
    }

    private void handleGetGroups(HttpExchange exchange) throws IOException {
        File file = new File(GROUPS_FILE);
        if (!file.exists()) {
            sendSuccess(exchange, new ArrayList<>());
            return;
        }
        String json = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
        // 使用标准 {code, data, message} 响应格式
        List<String> groups = GSON.fromJson(json, new TypeToken<List<String>>(){}.getType());
        sendSuccess(exchange, groups != null ? groups : new ArrayList<>());
    }

    private void handleSaveGroups(HttpExchange exchange) throws IOException {
        String body = readBody(exchange);

        List<?> parsed;
        try {
            parsed = GSON.fromJson(body, List.class);
            if (parsed == null) {
                sendError(exchange, 400, "分组数据不能为空");
                return;
            }
        } catch (Exception e) {
            sendError(exchange, 400, "无效的JSON格式: " + e.getMessage());
            return;
        }

        File groupsFile = new File(GROUPS_FILE);
        if (groupsFile.exists()) {
            File bak = new File(GROUPS_FILE + ".bak");
            try {
                Files.copy(groupsFile.toPath(), bak.toPath(), StandardCopyOption.REPLACE_EXISTING);
            } catch (Exception ignored) {}
        }

        try (Writer writer = new OutputStreamWriter(
                new FileOutputStream(GROUPS_FILE), StandardCharsets.UTF_8)) {
            writer.write(body);
        }
        sendSuccess(exchange, true);
    }

    private void handleRenewToken(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        Map<String, String> req = GSON.fromJson(body, new TypeToken<Map<String, String>>(){}.getType());
        String email = req.getOrDefault("email", "");
        String clientId = req.getOrDefault("clientId", "");
        String oldRefreshToken = req.getOrDefault("refreshToken", "");
        String password = req.getOrDefault("password", "");

        if (email.isEmpty() || clientId.isEmpty() || oldRefreshToken.isEmpty()) {
            sendError(exchange, 400, "缺少必要字段: email, clientId, refreshToken");
            return;
        }

        Map<String, String> tokens = mailService.obtainTokens(clientId, oldRefreshToken);
        if (tokens == null) {
            sendError(exchange, 401, "Token续期失败，token可能已过期或被撤销");
            return;
        }

        String newAccessToken = tokens.get("access_token");
        String newRefreshToken = tokens.get("refresh_token");

        if (newRefreshToken == null || newRefreshToken.isEmpty()) {
            sendError(exchange, 500, "未返回新的refresh_token");
            return;
        }

        // 先Graph验证，失败则IMAP降级验证
        boolean graphOk = mailService.verifyAccessToken(newAccessToken);
        boolean imapOk = !graphOk && mailService.verifyImapWithPassword(email, newAccessToken, password);
        boolean mailOk = graphOk || imapOk;

        String nowIso = java.time.Instant.now().toString();

        accountService.updateAccounts(accounts -> {
            for (Map<String, String> acc : accounts) {
                if (email.equalsIgnoreCase(acc.getOrDefault("email", ""))) {
                    acc.put("refreshToken", newRefreshToken);
                    acc.put("tokenRenewedAt", nowIso);
                    break;
                }
            }
            return accounts;
        });

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("tokenStatus", "valid");
        result.put("newRefreshToken", newRefreshToken);
        result.put("tokenRenewedAt", nowIso);
        result.put("mailAccessOk", mailOk);
        int daysRemaining = calcDaysRemaining(nowIso);
        result.put("daysRemaining", daysRemaining);
        result.put("expiryClass", calcExpiryClass(daysRemaining));
        sendSuccess(exchange, result);
    }

    private static final int MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

    private String readBody(HttpExchange exchange) throws IOException {
        long contentLength = exchange.getRequestHeaders().getFirst("Content-Length") != null
                ? Long.parseLong(exchange.getRequestHeaders().getFirst("Content-Length")) : -1;
        if (contentLength > MAX_BODY_SIZE) {
            throw new IOException("请求体过大: " + contentLength + " bytes (最大 " + MAX_BODY_SIZE + " bytes)");
        }
        try (InputStream is = exchange.getRequestBody()) {
            byte[] bytes = is.readNBytes(MAX_BODY_SIZE + 1);
            if (bytes.length > MAX_BODY_SIZE) {
                throw new IOException("请求体超过最大限制 " + MAX_BODY_SIZE + " bytes");
            }
            return new String(bytes, StandardCharsets.UTF_8);
        }
    }

    private Map<String, String> parseQueryParams(HttpExchange exchange) {
        Map<String, String> params = new LinkedHashMap<>();
        String query = exchange.getRequestURI().getRawQuery();
        if (query == null) return params;
        for (String pair : query.split("&")) {
            int idx = pair.indexOf("=");
            if (idx > 0) {
                String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                String value = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                params.put(key, value);
            }
        }
        return params;
    }

    private void sendJson(HttpExchange exchange, int status, String json) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.getResponseBody().close();
    }

    private void addCorsHeaders(HttpExchange exchange) {
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        String allowedOrigin = "*";
        if (origin != null && !origin.isEmpty()) {
            if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
                allowedOrigin = origin;
            }
        }
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", allowedOrigin);
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
        exchange.getResponseHeaders().set("Access-Control-Allow-Credentials", "true");
    }

    // 统一响应格式：{code, data, message}
    private void sendResponse(HttpExchange exchange, int httpStatus, Object data, String message) throws IOException {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("code", httpStatus);
        resp.put("data", data);
        resp.put("message", message != null ? message : "");
        sendJson(exchange, httpStatus, GSON.toJson(resp));
    }

    // 快捷：成功响应
    private void sendSuccess(HttpExchange exchange, Object data) throws IOException {
        sendResponse(exchange, 200, data, "ok");
    }

    // 快捷：错误响应
    private void sendError(HttpExchange exchange, int httpStatus, String message) throws IOException {
        sendResponse(exchange, httpStatus, null, message);
    }

    private void handleExtractCode(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String email, clientId, refreshToken, keyword, pattern, password, permissionType;

        if ("POST".equalsIgnoreCase(method)) {
            String body = readBody(exchange);
            java.lang.reflect.Type mapType = new com.google.gson.reflect.TypeToken<Map<String, String>>(){}.getType();
            Map<String, String> params = GSON.fromJson(body, mapType);
            if (params == null) params = new java.util.LinkedHashMap<>();
            email = params.getOrDefault("email", "");
            clientId = params.getOrDefault("clientId", "");
            refreshToken = params.getOrDefault("refreshToken", "");
            keyword = params.getOrDefault("keyword", "");
            pattern = params.getOrDefault("pattern", "");
            password = params.getOrDefault("password", "");
            permissionType = params.getOrDefault("permissionType", "");
        } else {
            Map<String, String> params = parseQueryParams(exchange);
            email = params.get("email");
            clientId = params.get("client_id");
            refreshToken = params.get("refresh_token");
            keyword = params.get("keyword");
            pattern = params.get("pattern");
            password = params.getOrDefault("password", "");
            permissionType = params.getOrDefault("permission_type", "");
        }

        if (email == null || email.isEmpty() || clientId == null || clientId.isEmpty()
                || refreshToken == null || refreshToken.isEmpty()) {
            sendError(exchange, 400, "缺少必填参数: email, clientId, refreshToken");
            return;
        }

        // 默认验证码正则：4-8位纯数字
        String codePattern = (pattern != null && !pattern.isEmpty()) ? pattern : "\\b\\d{4,8}\\b";

        try {
            // 获取邮件列表
            List<Map<String, String>> mails = mailService.fetchMails(
                    email, clientId, refreshToken, "INBOX", password, permissionType);

            List<Map<String, Object>> results = new ArrayList<>();
            java.util.regex.Pattern regex = java.util.regex.Pattern.compile(codePattern);

            for (Map<String, String> mail : mails) {
                String subject = mail.getOrDefault("subject", "");
                String sender = mail.getOrDefault("send", "");
                String textBody = mail.getOrDefault("text", "");
                String htmlBody = mail.getOrDefault("html", "");

                // 关键字过滤：匹配发件人或主题
                if (keyword != null && !keyword.isEmpty()) {
                    if (!subject.toLowerCase().contains(keyword.toLowerCase())
                            && !sender.toLowerCase().contains(keyword.toLowerCase())) {
                        continue;
                    }
                }

                // 从正文提取验证码（优先纯文本，其次HTML）
                String searchContent = !textBody.isEmpty() ? textBody : htmlBody;
                java.util.regex.Matcher matcher = regex.matcher(searchContent);
                if (matcher.find()) {
                    Map<String, Object> match = new LinkedHashMap<>();
                    match.put("code", matcher.group());
                    match.put("subject", subject);
                    match.put("sender", sender);
                    match.put("date", mail.getOrDefault("date", ""));
                    results.add(match);
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("email", email);
            if (!results.isEmpty()) {
                result.put("found", true);
                result.put("latest_code", results.get(0).get("code"));
                result.put("results", results);
            } else {
                result.put("found", false);
                result.put("message", "No verification code found");
            }
            sendSuccess(exchange, result);
        } catch (MailService.AuthException e) {
            sendError(exchange, 401, "认证失败: " + e.getMessage());
        } catch (Exception e) {
            sendError(exchange, 500, "验证码提取失败: " + e.getMessage());
        }
    }

    // ========================================================================
    // 安全相关API
    // ========================================================================

    private void handleLogin(HttpExchange exchange) throws IOException {
        String body = readBody(exchange);
        Map<String, String> req = GSON.fromJson(body, new TypeToken<Map<String, String>>(){}.getType());
        String password = req != null ? req.getOrDefault("password", "") : "";

        if (!securityService.isProtected()) {
            sendSuccess(exchange, Map.of("authenticated", true, "message", "无需密码"));
            return;
        }

        if (securityService.isLockedOut()) {
            long remaining = securityService.getLockoutRemainingSeconds();
            sendError(exchange, 429, "登录尝试过多，请" + remaining + "秒后重试");
            return;
        }

        String token = securityService.login(password);
        if (token != null) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("authenticated", true);
            result.put("token", token);
            exchange.getResponseHeaders().set("Set-Cookie",
                    "MAILPILOT_SESSION=" + token + "; Path=/; HttpOnly; SameSite=Strict");
            sendSuccess(exchange, result);
            log("INFO", "用户登录成功");
        } else {
            int remaining = MAX_LOGIN_ATTEMPTS - securityService.getFailedAttempts();
            sendError(exchange, 401, "密码错误" + (remaining > 0 ? "，剩余" + remaining + "次尝试" : ""));
            log("WARN", "登录失败，剩余尝试: " + remaining);
        }
    }

    private void handleLogout(HttpExchange exchange) throws IOException {
        securityService.logout();
        exchange.getResponseHeaders().set("Set-Cookie",
                "MAILPILOT_SESSION=; Path=/; HttpOnly; Max-Age=0");
        sendSuccess(exchange, Map.of("message", "已登出"));
        log("INFO", "用户登出");
    }

    private void handleSecurityStatus(HttpExchange exchange) throws IOException {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("enabled", securityService.isEnabled());
        status.put("protected", securityService.isProtected());
        status.put("authenticated", securityService.hasActiveSession());
        status.put("lockedOut", securityService.isLockedOut());
        if (securityService.isLockedOut()) {
            status.put("lockoutRemaining", securityService.getLockoutRemainingSeconds());
        }
        status.put("cloud", securityService.getCloudConfig());
        sendSuccess(exchange, status);
    }

    private void handleSetPassword(HttpExchange exchange) throws IOException {
        String body = readBody(exchange);
        Map<String, String> req = GSON.fromJson(body, new TypeToken<Map<String, String>>(){}.getType());
        String oldPassword = req != null ? req.getOrDefault("oldPassword", "") : "";
        String newPassword = req != null ? req.getOrDefault("newPassword", "") : "";

        if (securityService.isProtected() && !securityService.isRequestAuthenticated(exchange)) {
            sendError(exchange, 401, "需要先登录");
            return;
        }

        if (newPassword.length() < 4) {
            sendError(exchange, 400, "密码至少4位");
            return;
        }

        boolean ok = securityService.setPassword(oldPassword, newPassword);
        if (ok) {
            sendSuccess(exchange, Map.of("message", "密码设置成功"));
            log("INFO", "安全密码已设置");
        } else {
            sendError(exchange, 400, "旧密码不正确");
        }
    }

    private void handleRemovePassword(HttpExchange exchange) throws IOException {
        String body = readBody(exchange);
        Map<String, String> req = GSON.fromJson(body, new TypeToken<Map<String, String>>(){}.getType());
        String currentPassword = req != null ? req.getOrDefault("password", "") : "";

        boolean ok = securityService.removePassword(currentPassword);
        if (ok) {
            sendSuccess(exchange, Map.of("message", "密码已移除，安全保护已关闭"));
            log("INFO", "安全密码已移除");
        } else {
            sendError(exchange, 400, "密码不正确");
        }
    }

    private static final int MAX_LOGIN_ATTEMPTS = 5;

}