import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class SecurityService {

    private static final String CONFIG_FILE = "output/security.json";
    private static final int RATE_LIMIT_PER_MINUTE = 60;
    private static final int SESSION_DURATION_MINUTES = 120;
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private final SecureRandom random = new SecureRandom();

    private boolean enabled = false;
    private String passwordHash = null;
    private String salt = null;

    private String sessionToken = null;
    private long sessionExpiryTime = 0;

    private int failedAttempts = 0;
    private long lockoutUntil = 0;

    private final ConcurrentHashMap<String, AtomicLong> rateLimitCounters = new ConcurrentHashMap<>();
    private volatile long rateLimitWindowStart = System.currentTimeMillis();

    // 域名白名单（云端部署时由用户配置，本地运行无需设置）
    private volatile String allowedDomain = null;

    // Cloudflare 预留字段（云端部署时由用户配置）
    private volatile String cfTurnstileSiteKey = null;
    private volatile String cfTurnstileSecretKey = null;

    public SecurityService() {
        loadConfig();
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isProtected() {
        return enabled && passwordHash != null;
    }

    public boolean hasActiveSession() {
        return sessionToken != null && System.currentTimeMillis() < sessionExpiryTime;
    }

    public boolean validateSession(String token) {
        if (sessionToken == null) return false;
        if (System.currentTimeMillis() >= sessionExpiryTime) {
            sessionToken = null;
            return false;
        }
        return sessionToken.equals(token);
    }

    public String login(String password) {
        if (!enabled) return null;
        if (passwordHash == null) return null;

        if (isLockedOut()) return null;

        String inputHash = hashPassword(password, salt);
        if (inputHash.equals(passwordHash)) {
            failedAttempts = 0;
            sessionToken = generateToken();
            sessionExpiryTime = System.currentTimeMillis() + SESSION_DURATION_MINUTES * 60_000L;
            return sessionToken;
        }

        failedAttempts++;
        if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
            lockoutUntil = System.currentTimeMillis() + LOCKOUT_MINUTES * 60_000L;
        }
        return null;
    }

    public void logout() {
        sessionToken = null;
        sessionExpiryTime = 0;
    }

    public boolean setPassword(String oldPassword, String newPassword) {
        if (passwordHash != null) {
            if (oldPassword == null) return false;
            String inputHash = hashPassword(oldPassword, salt);
            if (!inputHash.equals(passwordHash)) return false;
        }

        if (newPassword == null || newPassword.length() < 4) return false;

        this.salt = generateSalt();
        this.passwordHash = hashPassword(newPassword, salt);
        this.enabled = true;
        this.sessionToken = null;
        this.sessionExpiryTime = 0;
        saveConfig();
        return true;
    }

    public boolean removePassword(String currentPassword) {
        if (passwordHash != null) {
            if (currentPassword == null) return false;
            String inputHash = hashPassword(currentPassword, salt);
            if (!inputHash.equals(passwordHash)) return false;
        }

        this.passwordHash = null;
        this.salt = null;
        this.enabled = false;
        this.sessionToken = null;
        this.sessionExpiryTime = 0;
        saveConfig();
        return true;
    }

    public void enable() {
        this.enabled = true;
        saveConfig();
    }

    public void disable() {
        this.enabled = false;
        this.sessionToken = null;
        this.sessionExpiryTime = 0;
        saveConfig();
    }

    public boolean isLockedOut() {
        return lockoutUntil > System.currentTimeMillis();
    }

    public long getLockoutRemainingSeconds() {
        if (!isLockedOut()) return 0;
        return (lockoutUntil - System.currentTimeMillis()) / 1000;
    }

    public int getFailedAttempts() {
        return failedAttempts;
    }

    public boolean checkRateLimit(HttpExchange exchange) {
        long now = System.currentTimeMillis();
        long windowStart = rateLimitWindowStart;
        if (now - windowStart > 60_000) {
            rateLimitWindowStart = now;
            rateLimitCounters.clear();
        }
        String clientIp = exchange.getRemoteAddress().getAddress().getHostAddress();
        AtomicLong counter = rateLimitCounters.computeIfAbsent(clientIp, k -> new AtomicLong(0));
        long count = counter.incrementAndGet();
        return count <= RATE_LIMIT_PER_MINUTE;
    }

    public boolean checkRateLimit(String clientIp) {
        long now = System.currentTimeMillis();
        long windowStart = rateLimitWindowStart;
        if (now - windowStart > 60_000) {
            rateLimitWindowStart = now;
            rateLimitCounters.clear();
        }
        AtomicLong counter = rateLimitCounters.computeIfAbsent(clientIp, k -> new AtomicLong(0));
        long count = counter.incrementAndGet();
        return count <= RATE_LIMIT_PER_MINUTE;
    }

    public boolean isDebuggerAttached() {
        return java.lang.management.ManagementFactory.getRuntimeMXBean()
                .getInputArguments().toString().contains("-agentlib:jdwp");
    }

    public String extractSessionFromRequest(HttpExchange exchange) {
        String cookieHeader = exchange.getRequestHeaders().getFirst("Cookie");
        if (cookieHeader == null) return null;
        for (String cookie : cookieHeader.split(";")) {
            String trimmed = cookie.trim();
            if (trimmed.startsWith("MAILPILOT_SESSION=")) {
                return trimmed.substring("MAILPILOT_SESSION=".length());
            }
        }
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    public boolean isRequestAuthenticated(HttpExchange exchange) {
        if (!enabled || passwordHash == null) return true;
        String token = extractSessionFromRequest(exchange);
        return validateSession(token);
    }

    // ========================================================================
    // 域名与 Cloudflare 预留接口
    // 云端部署时由用户自行配置，本地运行无需设置
    // ========================================================================

    public String getAllowedDomain() {
        return allowedDomain;
    }

    public void setAllowedDomain(String domain) {
        this.allowedDomain = domain;
        saveConfig();
    }

    public boolean isDomainAllowed(String requestHost) {
        if (allowedDomain == null || allowedDomain.isEmpty()) return true;
        return allowedDomain.equalsIgnoreCase(requestHost)
                || requestHost.endsWith("." + allowedDomain);
    }

    public boolean isCloudDeployment() {
        return allowedDomain != null && !allowedDomain.isEmpty();
    }

    public String getCfTurnstileSiteKey() {
        return cfTurnstileSiteKey;
    }

    public void setCfTurnstileKeys(String siteKey, String secretKey) {
        this.cfTurnstileSiteKey = siteKey;
        this.cfTurnstileSecretKey = secretKey;
        saveConfig();
    }

    public boolean isCfTurnstileEnabled() {
        return cfTurnstileSiteKey != null && cfTurnstileSecretKey != null;
    }

    public boolean verifyCfTurnstileToken(String turnstileToken) {
        if (!isCfTurnstileEnabled()) return true;
        // 预留：云端部署时实现 Cloudflare Turnstile 服务端验证
        // POST https://challenges.cloudflare.com/turnstile/v0/siteverify
        // Body: secret={secretKey}&response={turnstileToken}
        return true;
    }

    public Map<String, Object> getCloudConfig() {
        Map<String, Object> config = new java.util.LinkedHashMap<>();
        config.put("cloudDeployment", isCloudDeployment());
        config.put("allowedDomain", allowedDomain);
        config.put("cfTurnstileEnabled", isCfTurnstileEnabled());
        config.put("cfTurnstileSiteKey", cfTurnstileSiteKey);
        return config;
    }

    private String hashPassword(String password, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt.getBytes(StandardCharsets.UTF_8));
            byte[] hash = md.digest(password.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private String generateSalt() {
        byte[] saltBytes = new byte[32];
        random.nextBytes(saltBytes);
        return HexFormat.of().formatHex(saltBytes);
    }

    private String generateToken() {
        byte[] tokenBytes = new byte[48];
        random.nextBytes(tokenBytes);
        return HexFormat.of().formatHex(tokenBytes);
    }

    private void loadConfig() {
        Path path = Path.of(CONFIG_FILE);
        if (!Files.exists(path)) return;

        try {
            String content = Files.readString(path, StandardCharsets.UTF_8);
            JsonObject json = JsonParser.parseString(content).getAsJsonObject();

            if (json.has("enabled")) enabled = json.get("enabled").getAsBoolean();
            if (json.has("passwordHash") && !json.get("passwordHash").isJsonNull()) {
                passwordHash = json.get("passwordHash").getAsString();
            }
            if (json.has("salt") && !json.get("salt").isJsonNull()) {
                salt = json.get("salt").getAsString();
            }
            if (json.has("allowedDomain") && !json.get("allowedDomain").isJsonNull()) {
                allowedDomain = json.get("allowedDomain").getAsString();
            }
            if (json.has("cfTurnstileSiteKey") && !json.get("cfTurnstileSiteKey").isJsonNull()) {
                cfTurnstileSiteKey = json.get("cfTurnstileSiteKey").getAsString();
            }
            if (json.has("cfTurnstileSecretKey") && !json.get("cfTurnstileSecretKey").isJsonNull()) {
                cfTurnstileSecretKey = json.get("cfTurnstileSecretKey").getAsString();
            }
        } catch (Exception ignored) {
        }
    }

    private void saveConfig() {
        try {
            Path path = Path.of(CONFIG_FILE);
            Files.createDirectories(path.getParent());

            JsonObject json = new JsonObject();
            json.addProperty("enabled", enabled);
            if (passwordHash != null) json.addProperty("passwordHash", passwordHash);
            else json.add("passwordHash", null);
            if (salt != null) json.addProperty("salt", salt);
            else json.add("salt", null);
            if (allowedDomain != null) json.addProperty("allowedDomain", allowedDomain);
            else json.add("allowedDomain", null);
            if (cfTurnstileSiteKey != null) json.addProperty("cfTurnstileSiteKey", cfTurnstileSiteKey);
            else json.add("cfTurnstileSiteKey", null);
            if (cfTurnstileSecretKey != null) json.addProperty("cfTurnstileSecretKey", cfTurnstileSecretKey);
            else json.add("cfTurnstileSecretKey", null);

            Files.writeString(path, gson.toJson(json), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
        }
    }
}