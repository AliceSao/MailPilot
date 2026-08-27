import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.Function;

public class AccountService {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private final String accountsFile;
    // 读写锁：保护accounts.json的并发读写安全
    private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();

    public AccountService(String accountsFile) {
        this.accountsFile = accountsFile;
    }

    public List<Map<String, String>> loadAccounts() {
        rwLock.readLock().lock();
        try {
            File file = new File(accountsFile);
            if (!file.exists()) return new ArrayList<>();
            try {
                String content = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
                List<Map<String, String>> accounts = GSON.fromJson(content,
                        new TypeToken<List<Map<String, String>>>(){}.getType());
                return accounts != null ? accounts : new ArrayList<>();
            } catch (Exception e) {
                e.printStackTrace();
                return new ArrayList<>();
            }
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public boolean saveAccounts(String json) {
        rwLock.writeLock().lock();
        try {
            List<Map<String, String>> newAccounts = GSON.fromJson(json,
                    new TypeToken<List<Map<String, String>>>(){}.getType());
            if (newAccounts == null || newAccounts.isEmpty()) return false;

            backupAccounts();
            try (Writer writer = new OutputStreamWriter(
                    new FileOutputStream(accountsFile), StandardCharsets.UTF_8)) {
                GSON.toJson(newAccounts, writer);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    public boolean saveAccountsList(List<Map<String, String>> accounts) {
        rwLock.writeLock().lock();
        try {
            if (accounts == null || accounts.isEmpty()) return false;
            backupAccounts();
            try (Writer writer = new OutputStreamWriter(
                    new FileOutputStream(accountsFile), StandardCharsets.UTF_8)) {
                GSON.toJson(accounts, writer);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    public String readAccountsJson() {
        rwLock.readLock().lock();
        try {
            File file = new File(accountsFile);
            if (!file.exists()) return "[]";
            try {
                return new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            } catch (Exception e) {
                return "[]";
            }
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public void mergeAccounts(List<Map<String, String>> incoming) {
        rwLock.writeLock().lock();
        try {
            List<Map<String, String>> existing = loadAccountsInternal();
            Map<String, Map<String, String>> merged = new LinkedHashMap<>();

            for (Map<String, String> acc : existing) {
                String email = acc.get("email");
                if (email != null) merged.put(email.toLowerCase(), acc);
            }
            for (Map<String, String> acc : incoming) {
                String email = acc.get("email");
                if (email != null) merged.put(email.toLowerCase(), acc);
            }

            saveAccountsListInternal(new ArrayList<>(merged.values()));
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    // 内部方法：在已持有锁的情况下调用，避免重复加锁
    private List<Map<String, String>> loadAccountsInternal() {
        File file = new File(accountsFile);
        if (!file.exists()) return new ArrayList<>();
        try {
            String content = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            List<Map<String, String>> accounts = GSON.fromJson(content,
                    new TypeToken<List<Map<String, String>>>(){}.getType());
            return accounts != null ? accounts : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    // 内部方法：在已持有锁的情况下调用，避免重复加锁
    private void saveAccountsListInternal(List<Map<String, String>> accounts) {
        try {
            if (accounts == null || accounts.isEmpty()) return;
            backupAccounts();
            try (Writer writer = new OutputStreamWriter(
                    new FileOutputStream(accountsFile), StandardCharsets.UTF_8)) {
                GSON.toJson(accounts, writer);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void backupAccounts() {
        File file = new File(accountsFile);
        if (file.exists()) {
            File bak = new File(accountsFile + ".bak");
            try {
                Files.copy(file.toPath(), bak.toPath(), StandardCopyOption.REPLACE_EXISTING);
            } catch (Exception ignored) {}
        }
    }

    /**
     * 原子更新：在写锁内执行 load→modify→save，避免竞态条件
     * modifier函数接收当前账号列表，返回修改后的列表（可直接修改原列表并返回）
     */
    public List<Map<String, String>> updateAccounts(Function<List<Map<String, String>>, List<Map<String, String>>> modifier) {
        rwLock.writeLock().lock();
        try {
            List<Map<String, String>> accounts = loadAccountsInternal();
            List<Map<String, String>> modified = modifier.apply(accounts);
            if (modified != null && !modified.isEmpty()) {
                saveAccountsListInternal(modified);
            }
            return modified;
        } finally {
            rwLock.writeLock().unlock();
        }
    }
}