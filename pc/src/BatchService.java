import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

public class BatchService {
    private final MailService mailService;
    private final AccountService accountService;
    private static final int MAX_CONCURRENT = 8;
    private final Semaphore concurrencyLimiter = new Semaphore(MAX_CONCURRENT);

    public BatchService(MailService mailService, AccountService accountService) {
        this.mailService = mailService;
        this.accountService = accountService;
    }

    public List<Map<String, Object>> checkTokens(List<Map<String, String>> accounts) {
        List<CompletableFuture<Map<String, Object>>> futures = new ArrayList<>();

        for (Map<String, String> account : accounts) {
            CompletableFuture<Map<String, Object>> future = CompletableFuture.supplyAsync(() -> {
                try {
                    concurrencyLimiter.acquire();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("email", account.getOrDefault("email", ""));
                    result.put("status", "invalid");
                    result.put("error", "操作被中断");
                    result.put("tokenStatus", "invalid");
                    return result;
                }
                try {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("email", account.getOrDefault("email", ""));
                    result.put("originalIndex", account.get("_index"));

                    String clientId = account.get("clientId");
                    String refreshToken = account.get("refreshToken");

                    if (clientId == null || refreshToken == null || clientId.isEmpty() || refreshToken.isEmpty()) {
                        result.put("status", "invalid");
                        result.put("error", "缺少clientId或refreshToken");
                        result.put("tokenStatus", "invalid");
                        return result;
                    }

                    try {
                        Map<String, String> tokens = mailService.obtainTokens(clientId, refreshToken);
                        if (tokens == null) {
                            result.put("status", "invalid");
                            result.put("error", "OAuth2 token exchange failed");
                            result.put("tokenStatus", "invalid");
                            return result;
                        }

                        String accessToken = tokens.get("access_token");
                        String email = account.getOrDefault("email", "");
                        // 先Graph验证，失败则IMAP降级验证（XOAUTH2→密码）
                        String password = account.getOrDefault("password", "");
                        boolean graphOk = mailService.verifyAccessToken(accessToken);
                        boolean imapOk = !graphOk && !email.isEmpty() && mailService.verifyImapWithPassword(email, accessToken, password);
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
                    } catch (Exception e) {
                        result.put("status", "invalid");
                        result.put("error", e.getMessage());
                        result.put("tokenStatus", "invalid");
                    }
                    return result;
                } finally {
                    concurrencyLimiter.release();
                }
            }, Thread.ofVirtual()::start);
            futures.add(future);
        }

        return futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> renewTokens(List<Map<String, String>> accounts) {
        List<CompletableFuture<Map<String, Object>>> futures = new ArrayList<>();

        for (Map<String, String> account : accounts) {
            CompletableFuture<Map<String, Object>> future = CompletableFuture.supplyAsync(() -> {
                try {
                    concurrencyLimiter.acquire();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("email", account.getOrDefault("email", ""));
                    result.put("status", "failed");
                    result.put("error", "操作被中断");
                    return result;
                }
                try {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("email", account.getOrDefault("email", ""));
                    result.put("originalIndex", account.get("_index"));

                    String clientId = account.get("clientId");
                    String refreshToken = account.get("refreshToken");

                    if (clientId == null || refreshToken == null || clientId.isEmpty() || refreshToken.isEmpty()) {
                        result.put("status", "failed");
                        result.put("error", "缺少clientId或refreshToken");
                        return result;
                    }

                    try {
                        Map<String, String> tokens = mailService.obtainTokens(clientId, refreshToken);
                        if (tokens == null) {
                            result.put("status", "failed");
                            result.put("error", "token exchange failed");
                            return result;
                        }

                        String newAccessToken = tokens.get("access_token");
                        String newRefreshToken = tokens.get("refresh_token");

                        if (newRefreshToken == null || newRefreshToken.isEmpty()) {
                            result.put("status", "failed");
                            result.put("error", "未返回新的refresh_token");
                            return result;
                        }

                        boolean graphOk = mailService.verifyAccessToken(newAccessToken);
                        String email = account.getOrDefault("email", "");
                        String password = account.getOrDefault("password", "");
                        boolean imapOk = !graphOk && !email.isEmpty() && mailService.verifyImapWithPassword(email, newAccessToken, password);
                        boolean mailOk = graphOk || imapOk;
                        String nowIso = java.time.Instant.now().toString();

                        result.put("status", "success");
                        result.put("tokenStatus", "valid");
                        result.put("newRefreshToken", newRefreshToken);
                        result.put("tokenRenewedAt", nowIso);
                        result.put("mailAccessOk", mailOk);
                        result.put("daysRemaining", PcServer.calcDaysRemaining(nowIso));
                        result.put("expiryClass", PcServer.calcExpiryClass(PcServer.calcDaysRemaining(nowIso)));
                    } catch (Exception e) {
                        result.put("status", "failed");
                        result.put("error", e.getMessage());
                    }
                    return result;
                } finally {
                    concurrencyLimiter.release();
                }
            }, Thread.ofVirtual()::start);
            futures.add(future);
        }

        List<Map<String, Object>> results = futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());

        accountService.updateAccounts(allAccounts -> {
            for (Map<String, Object> result : results) {
                if ("success".equals(result.get("status")) && result.containsKey("newRefreshToken")) {
                    String email = (String) result.get("email");
                    String newRefreshToken = (String) result.get("newRefreshToken");
                    String renewedAt = (String) result.get("tokenRenewedAt");
                    for (Map<String, String> acc : allAccounts) {
                        if (email.equalsIgnoreCase(acc.getOrDefault("email", ""))) {
                            acc.put("refreshToken", newRefreshToken);
                            acc.put("tokenRenewedAt", renewedAt != null ? renewedAt : java.time.Instant.now().toString());
                            break;
                        }
                    }
                }
            }
            return allAccounts;
        });

        return results;
    }

    public List<Map<String, Object>> deleteAccounts(List<Map<String, String>> accounts) {
        Set<String> emailsToDelete = new HashSet<>();
        for (Map<String, String> acc : accounts) {
            String email = acc.get("email");
            if (email != null) emailsToDelete.add(email.toLowerCase());
        }

        List<Map<String, Object>> results = new ArrayList<>();

        List<Map<String, String>> remaining = accountService.updateAccounts(allAccounts -> {
            List<Map<String, String>> kept = new ArrayList<>();
            for (Map<String, String> acc : allAccounts) {
                String email = acc.get("email");
                if (email != null && emailsToDelete.contains(email.toLowerCase())) {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("email", email);
                    result.put("status", "deleted");
                    results.add(result);
                } else {
                    kept.add(acc);
                }
            }
            return kept;
        });

        return results;
    }
}