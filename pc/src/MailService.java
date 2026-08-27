import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import okhttp3.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.mail.*;
import javax.mail.internet.MimeUtility;
import java.util.concurrent.TimeUnit;

public class MailService {
    private static final MediaType FORM_MEDIA = MediaType.parse("application/x-www-form-urlencoded");
    private static final String GRAPH_URL = "https://graph.microsoft.com/v1.0/me/mailFolders/%s/messages";
    private static final String TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    private static final String IMAP_HOST = "outlook.office365.com";

    private static final Map<String, String> FOLDER_MAP = new LinkedHashMap<>();
    static {
        FOLDER_MAP.put("INBOX", "Inbox");
        FOLDER_MAP.put("Junk", "JunkEmail");
        FOLDER_MAP.put("JunkEmail", "JunkEmail");
        FOLDER_MAP.put("Sent", "SentItems");
        FOLDER_MAP.put("SentItems", "SentItems");
        FOLDER_MAP.put("Drafts", "Drafts");
        FOLDER_MAP.put("Deleted", "DeletedItems");
        FOLDER_MAP.put("Archive", "Archive");
    }

    private final OkHttpClient httpClient;

    public MailService() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .build();
    }

    public static class AuthException extends Exception {
        public AuthException(String msg) { super(msg); }
    }

    public List<Map<String, String>> fetchMails(String email, String clientId,
            String refreshToken, String mailbox, String password, String permissionType) throws Exception {
        String accessToken = obtainAccessToken(clientId, refreshToken);
        if (accessToken == null) {
            throw new AuthException("OAuth2 token exchange failed");
        }

        if ("IMAP".equalsIgnoreCase(permissionType)) {
            return fetchMailsImap(email, accessToken, mailbox, password);
        }

        try {
            return fetchMailsGraph(accessToken, mailbox);
        } catch (AuthException graphErr) {
            try {
                return fetchMailsImap(email, accessToken, mailbox, password);
            } catch (Exception imapErr) {
                throw new AuthException("Graph and IMAP both failed: " + imapErr.getMessage());
            }
        } catch (Exception graphErr) {
            try {
                return fetchMailsImap(email, accessToken, mailbox, password);
            } catch (Exception imapErr) {
                throw new Exception("Both methods failed. Graph: " + graphErr.getMessage()
                        + " IMAP: " + imapErr.getMessage());
            }
        }
    }

    public String obtainAccessToken(String clientId, String refreshToken) throws IOException {
        Map<String, String> tokens = obtainTokens(clientId, refreshToken);
        return tokens != null ? tokens.get("access_token") : null;
    }

    public Map<String, String> obtainTokens(String clientId, String refreshToken) throws IOException {
        RequestBody body = new FormBody.Builder()
                .add("client_id", clientId)
                .add("refresh_token", refreshToken)
                .add("grant_type", "refresh_token")
                .build();

        Request request = new Request.Builder()
                .url(TOKEN_URL)
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) return null;
            String respBody = response.body() != null ? response.body().string() : "";
            JsonObject json = JsonParser.parseString(respBody).getAsJsonObject();
            if (!json.has("access_token")) return null;

            Map<String, String> tokens = new LinkedHashMap<>();
            tokens.put("access_token", json.get("access_token").getAsString());
            tokens.put("refresh_token", json.has("refresh_token")
                    ? json.get("refresh_token").getAsString() : refreshToken);
            if (json.has("scope")) {
                tokens.put("scope", json.get("scope").getAsString());
            }
            return tokens;
        }
    }

    public boolean verifyAccessToken(String accessToken) {
        return verifyGraphAccess(accessToken);
    }

    private boolean verifyGraphAccess(String accessToken) {
        try {
            String testUrl = "https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$top=1&$select=subject";
            Request testReq = new Request.Builder()
                    .url(testUrl)
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .get()
                    .build();
            try (Response testResp = httpClient.newCall(testReq).execute()) {
                return testResp.isSuccessful();
            }
        } catch (Exception e) {
            return false;
        }
    }

    public boolean verifyImapWithPassword(String email, String accessToken, String password) {
        try {
            Properties props = buildImapProps("XOAUTH2");
            Session session = Session.getInstance(props);
            Store store = session.getStore("imap");
            store.connect(IMAP_HOST, email, accessToken);
            store.close();
            return true;
        } catch (Exception ignored) {}
        if (password != null && !password.isEmpty()) {
            try {
                Thread.sleep(1500);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return false;
            }
            try {
                Properties props = buildImapProps("PLAIN LOGIN");
                Session session = Session.getInstance(props);
                Store store = session.getStore("imap");
                store.connect(IMAP_HOST, email, password);
                store.close();
                return true;
            } catch (Exception ignored) {}
        }
        return false;
    }

    private List<Map<String, String>> fetchMailsGraph(String accessToken, String mailbox)
            throws IOException, AuthException {
        String folder = FOLDER_MAP.getOrDefault(mailbox, mailbox);
        String baseUrl = String.format(GRAPH_URL, folder);
        String fullUrl = baseUrl + "?$top=20"
                + "&$orderby=" + java.net.URLEncoder.encode("receivedDateTime desc", StandardCharsets.UTF_8)
                + "&$select=" + java.net.URLEncoder.encode("subject,from,receivedDateTime,body,bodyPreview", StandardCharsets.UTF_8);

        Request request = new Request.Builder()
                .url(fullUrl)
                .addHeader("Authorization", "Bearer " + accessToken)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "";

            if (response.code() == 401 || response.code() == 403) {
                throw new AuthException("Graph API " + response.code());
            }
            if (!response.isSuccessful()) {
                throw new IOException("Graph API error: " + response.code());
            }

            JsonObject json = JsonParser.parseString(body).getAsJsonObject();
            JsonArray values = json.has("value") ? json.getAsJsonArray("value") : new JsonArray();

            List<Map<String, String>> results = new ArrayList<>();
            for (JsonElement elem : values) {
                JsonObject msg = elem.getAsJsonObject();
                Map<String, String> mail = new LinkedHashMap<>();

                String sender = "";
                if (msg.has("from") && !msg.get("from").isJsonNull()) {
                    JsonObject fromObj = msg.getAsJsonObject("from");
                    if (fromObj.has("emailAddress") && !fromObj.get("emailAddress").isJsonNull()) {
                        JsonObject emailAddr = fromObj.getAsJsonObject("emailAddress");
                        String name = emailAddr.has("name") && !emailAddr.get("name").isJsonNull()
                                ? emailAddr.get("name").getAsString() : "";
                        String addr = emailAddr.has("address") && !emailAddr.get("address").isJsonNull()
                                ? emailAddr.get("address").getAsString() : "";
                        sender = !name.isEmpty() ? name + " <" + addr + ">" : addr;
                    }
                }
                mail.put("send", sender);
                mail.put("subject", msg.has("subject") && !msg.get("subject").isJsonNull()
                        ? msg.get("subject").getAsString() : "");
                mail.put("date", msg.has("receivedDateTime") && !msg.get("receivedDateTime").isJsonNull()
                        ? msg.get("receivedDateTime").getAsString() : "");

                String textContent = "";
                String htmlContent = "";
                if (msg.has("body") && !msg.get("body").isJsonNull()) {
                    JsonObject bodyObj = msg.getAsJsonObject("body");
                    String content = bodyObj.has("content") && !bodyObj.get("content").isJsonNull()
                            ? bodyObj.get("content").getAsString() : "";
                    String contentType = bodyObj.has("contentType") && !bodyObj.get("contentType").isJsonNull()
                            ? bodyObj.get("contentType").getAsString() : "text";
                    if ("html".equalsIgnoreCase(contentType)) {
                        htmlContent = content;
                    } else {
                        textContent = content;
                    }
                }
                mail.put("text", textContent);
                mail.put("html", htmlContent);
                results.add(mail);
            }
            return results;
        }
    }

    private List<Map<String, String>> fetchMailsImap(String email, String accessToken, String mailbox, String password)
            throws Exception {
        // IMAP认证链路：XOAUTH2优先 → 密码认证降级
        Store store = null;

        // 尝试XOAUTH2认证
        try {
            Properties props = buildImapProps("XOAUTH2");
            Session session = Session.getInstance(props);
            store = session.getStore("imap");
            store.connect(IMAP_HOST, email, accessToken);
        } catch (Exception oauthErr) {
            if (password != null && !password.isEmpty()) {
                try {
                    Thread.sleep(1500);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new Exception("IMAP XOAUTH2失败且降级被中断: " + oauthErr.getMessage());
                }
                try {
                    store = null;
                    Properties props = buildImapProps("PLAIN LOGIN");
                    Session session = Session.getInstance(props);
                    store = session.getStore("imap");
                    store.connect(IMAP_HOST, email, password);
                } catch (Exception pwdErr) {
                    throw new Exception("IMAP XOAUTH2失败: " + oauthErr.getMessage()
                            + "；密码认证也失败: " + pwdErr.getMessage());
                }
            } else {
                throw new Exception("IMAP XOAUTH2认证失败且无密码可用: " + oauthErr.getMessage());
            }
        }

        List<Map<String, String>> results = new ArrayList<>();
        Folder folder = null;
        try {
            folder = store.getFolder(mailbox);
            folder.open(Folder.READ_ONLY);

            int messageCount = folder.getMessageCount();
            int start = Math.max(1, messageCount - 19);

            for (int i = messageCount; i >= start; i--) {
                try {
                    Message msg = folder.getMessage(i);
                    Map<String, String> mail = new LinkedHashMap<>();

                    // MIME解码：处理编码的邮件头
                    javax.mail.Address[] from = msg.getFrom();
                    String senderStr = "";
                    if (from != null && from.length > 0) {
                        try {
                            senderStr = MimeUtility.decodeText(from[0].toString());
                        } catch (Exception e) {
                            senderStr = from[0].toString();
                        }
                    }
                    mail.put("send", senderStr);

                    String subjectStr = "";
                    if (msg.getSubject() != null) {
                        try {
                            subjectStr = MimeUtility.decodeText(msg.getSubject());
                        } catch (Exception e) {
                            subjectStr = msg.getSubject();
                        }
                    }
                    mail.put("subject", subjectStr);
                    mail.put("date", msg.getSentDate() != null ? new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm").format(msg.getSentDate()) : "");

                    // 递归解析邮件内容
                    String[] contentResult = parsePart(msg);
                    mail.put("text", contentResult[0]);
                    mail.put("html", contentResult[1]);
                    results.add(mail);
                } catch (Exception e) {
                    Map<String, String> errorMail = new LinkedHashMap<>();
                    errorMail.put("send", "");
                    errorMail.put("subject", "[解析错误]");
                    errorMail.put("date", "");
                    errorMail.put("text", e.getMessage() != null ? e.getMessage() : "未知错误");
                    errorMail.put("html", "");
                    results.add(errorMail);
                }
            }
        } finally {
            if (folder != null) {
                try { folder.close(false); } catch (Exception ignored) {}
            }
            try { store.close(); } catch (Exception ignored) {}
        }
        return results;
    }

    private Properties buildImapProps(String authMechanisms) {
        Properties props = new Properties();
        props.put("mail.imap.ssl.enable", "true");
        props.put("mail.imap.auth.mechanisms", authMechanisms);
        props.put("mail.imap.port", "993");
        props.put("mail.imap.connectiontimeout", "15000");
        props.put("mail.imap.timeout", "15000");
        return props;
    }

    // 递归解析MIME部件，返回 [text, html]
    private String[] parsePart(Part part) {
        String text = "";
        String html = "";
        try {
            if (part.isMimeType("text/plain")) {
                text = decodePartContent(part);
            } else if (part.isMimeType("text/html")) {
                html = decodePartContent(part);
            } else if (part.isMimeType("multipart/alternative")) {
                // multipart/alternative：优先HTML，备选纯文本
                Multipart mp = (Multipart) part.getContent();
                for (int i = 0; i < mp.getCount(); i++) {
                    BodyPart bp = mp.getBodyPart(i);
                    String[] sub = parsePart(bp);
                    if (!sub[0].isEmpty()) text = sub[0];
                    if (!sub[1].isEmpty()) html = sub[1];
                }
            } else if (part.isMimeType("multipart/*")) {
                // multipart/mixed, multipart/related等：递归解析所有子部件
                Multipart mp = (Multipart) part.getContent();
                for (int i = 0; i < mp.getCount(); i++) {
                    BodyPart bp = mp.getBodyPart(i);
                    String[] sub = parsePart(bp);
                    if (!sub[0].isEmpty() && text.isEmpty()) text = sub[0];
                    if (!sub[1].isEmpty() && html.isEmpty()) html = sub[1];
                }
            } else if (part.isMimeType("message/rfc822")) {
                // 嵌套邮件
                Object content = part.getContent();
                if (content instanceof Message) {
                    String[] sub = parsePart((Message) content);
                    text = sub[0];
                    html = sub[1];
                }
            }
        } catch (Exception e) {
            // 解析失败时静默跳过
        }
        return new String[]{text, html};
    }

    // 解码部件内容，处理Content-Transfer-Encoding和charset
    private String decodePartContent(Part part) {
        try {
            Object content = part.getContent();
            if (content == null) return "";

            if (content instanceof String) {
                return (String) content;
            }

            if (content instanceof InputStream) {
                // 某些编码方式（如base64）getContent返回InputStream
                InputStream is = (InputStream) content;
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int len;
                while ((len = is.read(buf)) != -1) {
                    bos.write(buf, 0, len);
                }
                is.close();

                // 从Content-Type中提取charset
                String charset = "UTF-8";
                String contentType = part.getContentType();
                if (contentType != null) {
                    String ctLower = contentType.toLowerCase();
                    int ci = ctLower.indexOf("charset=");
                    if (ci >= 0) {
                        String cs = contentType.substring(ci + 8).trim();
                        // 去掉可能的引号和分号后的内容
                        cs = cs.replace("\"", "").split(";")[0].trim();
                        if (!cs.isEmpty()) charset = cs;
                    }
                }
                try {
                    return bos.toString(charset);
                } catch (java.io.UnsupportedEncodingException e) {
                    return bos.toString("UTF-8");
                }
            }

            return content.toString();
        } catch (Exception e) {
            return "";
        }
    }
}