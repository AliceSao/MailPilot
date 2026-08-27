package com.mailpilot.app;

import android.content.Context;
import android.content.res.AssetManager;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.reflect.TypeToken;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.TimeZone;

import javax.mail.*;
import javax.mail.internet.*;

import fi.iki.elonen.NanoHTTPD;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;

public class LocalServer extends NanoHTTPD {

    private static final String OAUTH2_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    private static final String GRAPH_MESSAGES_URL = "https://graph.microsoft.com/v1.0/me/mailFolders/%s/messages";

    private static final Map<String, String> FOLDER_MAP = new HashMap<>();
    static {
        FOLDER_MAP.put("INBOX", "Inbox");
        FOLDER_MAP.put("Junk", "JunkEmail");
        FOLDER_MAP.put("JunkEmail", "JunkEmail");
        FOLDER_MAP.put("Drafts", "Drafts");
        FOLDER_MAP.put("SentItems", "SentItems");
        FOLDER_MAP.put("Sent", "SentItems");
    }

    private final Context context;
    private final AssetManager assetManager;
    private final Gson gson;
    private final OkHttpClient httpClient;
    private final File accountsFile;
    private final File groupsFile;

    public LocalServer(int port, Context context) {
        super(port);
        this.context = context;
        this.assetManager = context.getAssets();
        this.gson = new GsonBuilder().disableHtmlEscaping().create();
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(20, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .build();
        this.accountsFile = new File(context.getFilesDir(), "accounts.json");
        this.groupsFile = new File(context.getFilesDir(), "groups.json");
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        Method method = session.getMethod();

        try {
            // API routes
            if (uri.startsWith("/api/")) {
                return handleApi(uri, method, session);
            }

            // Static file routes
            return serveStaticFile(uri);

        } catch (Exception e) {
            e.printStackTrace();
            return newJsonResponse(Response.Status.INTERNAL_ERROR,
                    errorJson("Internal server error: " + e.getMessage()));
        }
    }

    // ========================================================================
    // Static file serving
    // ========================================================================

    private Response serveStaticFile(String uri) {
        String filePath;
        if (uri.equals("/") || uri.equals("/index.html")) {
            filePath = "static/index.html";
        } else if (uri.startsWith("/")) {
            filePath = "static" + uri;
        } else {
            filePath = "static/" + uri;
        }

        try {
            InputStream is = assetManager.open(filePath);
            byte[] data = readAllBytes(is);
            is.close();

            String mimeType = getMimeType(filePath);
            Response resp = newFixedLengthResponse(Response.Status.OK, mimeType, new java.io.ByteArrayInputStream(data), data.length);
            resp.addHeader("Access-Control-Allow-Origin", "*");
            return resp;
        } catch (IOException e) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found: " + uri);
        }
    }

    private String getMimeType(String path) {
        if (path.endsWith(".html")) return "text/html; charset=utf-8";
        if (path.endsWith(".css")) return "text/css; charset=utf-8";
        if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (path.endsWith(".json")) return "application/json; charset=utf-8";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".gif")) return "image/gif";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    private byte[] readAllBytes(InputStream is) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = is.read(buf)) != -1) {
            baos.write(buf, 0, n);
        }
        return baos.toByteArray();
    }

    // ========================================================================
    // API routing
    // ========================================================================

    private Response handleApi(String uri, Method method, IHTTPSession session) {
        try {
            // Parse query parameters for GET requests
            Map<String, String> queryParams = new LinkedHashMap<>();
            String queryString = session.getQueryParameterString();
            if (queryString != null && !queryString.isEmpty()) {
                for (String pair : queryString.split("&")) {
                    int idx = pair.indexOf('=');
                    if (idx > 0) {
                        String key = URLDecoder.decode(pair.substring(0, idx), "UTF-8");
                        String value = idx < pair.length() - 1
                                ? URLDecoder.decode(pair.substring(idx + 1), "UTF-8") : "";
                        queryParams.put(key, value);
                    }
                }
            }

            // Route matching
            if (uri.equals("/api/mail-all") && method == Method.GET) {
                return handleMailAll(queryParams);
            }
            if (uri.equals("/api/renew-token") && method == Method.POST) {
                return handleRenewToken(session);
            }
            if (uri.equals("/api/accounts")) {
                if (method == Method.GET) return handleGetAccounts();
                if (method == Method.POST) return handlePostAccounts(session);
            }
            if (uri.equals("/api/groups")) {
                if (method == Method.GET) return handleGetGroups();
                if (method == Method.POST) return handlePostGroups(session);
            }
            if (uri.equals("/api/export") && method == Method.GET) {
                return handleExport();
            }
            if (uri.equals("/api/import") && method == Method.POST) {
                return handleImport(session);
            }

            return newJsonResponse(Response.Status.NOT_FOUND, errorJson("API not found: " + uri));

        } catch (Exception e) {
            e.printStackTrace();
            return newJsonResponse(Response.Status.INTERNAL_ERROR,
                    errorJson("Server error: " + e.getMessage()));
        }
    }

    // ========================================================================
    // /api/mail-all — fetch emails via Microsoft Graph API
    // ========================================================================

    private Response handleMailAll(Map<String, String> params) {
        String refreshToken = params.get("refresh_token");
        String clientId = params.get("client_id");
        String email = params.get("email");
        String mailbox = params.getOrDefault("mailbox", "INBOX");

        if (refreshToken == null || clientId == null || email == null) {
            return newJsonResponse(Response.Status.BAD_REQUEST,
                    errorJson("Missing required parameters"));
        }

        // 1. Exchange refresh_token for access_token
        String accessToken;
        try {
            accessToken = obtainAccessToken(clientId, refreshToken);
        } catch (Exception e) {
            return newJsonResponse(Response.Status.INTERNAL_ERROR,
                    errorJson("OAuth2 request error: " + e.getMessage()));
        }

        if (accessToken == null) {
            return newJsonResponse(Response.Status.UNAUTHORIZED,
                    errorJson("OAuth2 token exchange failed"));
        }

        // 2. Fetch mails from Graph API, fall back to IMAP on auth failure
        try {
            List<Map<String, String>> mails = fetchMailsGraph(accessToken, mailbox, 20);
            return newJsonResponse(Response.Status.OK, gson.toJson(mails));
        } catch (GraphAuthException e) {
            // Graph API returned 401/403, try IMAP fallback
            try {
                String imapResult = fetchMailsImap(email, accessToken, mailbox);
                return newJsonResponse(Response.Status.OK, imapResult);
            } catch (Exception imapErr) {
                return newJsonResponse(Response.Status.UNAUTHORIZED,
                        errorJson("Both Graph and IMAP failed"));
            }
        } catch (Exception e) {
            return newJsonResponse(Response.Status.INTERNAL_ERROR,
                    errorJson(e.getMessage()));
        }
    }

    private String obtainAccessToken(String clientId, String refreshToken) throws IOException {
        RequestBody formBody = new FormBody.Builder()
                .add("client_id", clientId)
                .add("refresh_token", refreshToken)
                .add("grant_type", "refresh_token")
                .build();

        Request request = new Request.Builder()
                .url(OAUTH2_URL)
                .post(formBody)
                .build();

        try (okhttp3.Response response = httpClient.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "";
            if (response.isSuccessful()) {
                JsonObject json = JsonParser.parseString(body).getAsJsonObject();
                if (json.has("access_token")) {
                    return json.get("access_token").getAsString();
                }
            }
            return null;
        }
    }

    private List<Map<String, String>> fetchMailsGraph(String accessToken, String mailbox, int count)
            throws IOException, GraphAuthException {

        String folder = FOLDER_MAP.getOrDefault(mailbox, mailbox);
        String url = String.format(GRAPH_MESSAGES_URL, folder);

        // Build URL with query parameters
        String fullUrl = url + "?$top=" + count
                + "&$orderby=" + URLEncoder.encode("receivedDateTime desc", "UTF-8")
                + "&$select=" + URLEncoder.encode("subject,from,receivedDateTime,body,bodyPreview", "UTF-8");

        Request request = new Request.Builder()
                .url(fullUrl)
                .addHeader("Authorization", "Bearer " + accessToken)
                .get()
                .build();

        try (okhttp3.Response response = httpClient.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "";

            if (response.code() == 401 || response.code() == 403) {
                throw new GraphAuthException("Graph API " + response.code());
            }

            if (!response.isSuccessful()) {
                throw new IOException("Graph API error: " + response.code());
            }

            JsonObject json = JsonParser.parseString(body).getAsJsonObject();
            JsonArray values = json.has("value") ? json.getAsJsonArray("value") : new JsonArray();

            List<Map<String, String>> results = new ArrayList<>();
            for (JsonElement elem : values) {
                JsonObject msg = elem.getAsJsonObject();

                // Parse sender
                String sender = "";
                if (msg.has("from") && !msg.get("from").isJsonNull()) {
                    JsonObject fromObj = msg.getAsJsonObject("from");
                    if (fromObj.has("emailAddress") && !fromObj.get("emailAddress").isJsonNull()) {
                        JsonObject emailAddr = fromObj.getAsJsonObject("emailAddress");
                        String name = emailAddr.has("name") ? emailAddr.get("name").getAsString() : "";
                        String addr = emailAddr.has("address") ? emailAddr.get("address").getAsString() : "";
                        sender = (name != null && !name.isEmpty()) ? name + " <" + addr + ">" : addr;
                    }
                }

                // Parse body
                String textContent = "";
                String htmlContent = "";
                if (msg.has("body") && !msg.get("body").isJsonNull()) {
                    JsonObject bodyObj = msg.getAsJsonObject("body");
                    String content = bodyObj.has("content") ? bodyObj.get("content").getAsString() : "";
                    String contentType = bodyObj.has("contentType") ? bodyObj.get("contentType").getAsString() : "text";
                    if ("html".equalsIgnoreCase(contentType)) {
                        htmlContent = content;
                    } else {
                        textContent = content;
                    }
                }

                Map<String, String> mail = new LinkedHashMap<>();
                mail.put("send", sender);
                mail.put("subject", msg.has("subject") ? msg.get("subject").getAsString() : "");
                mail.put("date", msg.has("receivedDateTime") ? msg.get("receivedDateTime").getAsString() : "");
                mail.put("text", textContent);
                mail.put("html", htmlContent);
                results.add(mail);
            }

            return results;
        }
    }

    // ========================================================================
    // IMAP fallback — used when Graph API returns 401/403
    // ========================================================================

    private String fetchMailsImap(String emailAddr, String accessToken, String mailbox) throws Exception {
        Properties props = new Properties();
        props.put("mail.imap.ssl.enable", "true");
        props.put("mail.imap.auth.mechanisms", "XOAUTH2");
        props.put("mail.imap.port", "993");
        props.put("mail.imap.connectiontimeout", "15000");
        props.put("mail.imap.timeout", "15000");

        javax.mail.Session session = javax.mail.Session.getInstance(props);
        Store store = session.getStore("imap");
        store.connect("outlook.office365.com", emailAddr, accessToken);

        String folderName = "INBOX";
        if ("JunkEmail".equals(mailbox) || "Junk".equals(mailbox)) folderName = "Junk";

        Folder folder = store.getFolder(folderName);
        folder.open(Folder.READ_ONLY);

        int count = folder.getMessageCount();
        int start = Math.max(1, count - 19);
        Message[] messages = folder.getMessages(start, count);

        JsonArray arr = new JsonArray();
        for (int i = messages.length - 1; i >= 0; i--) {
            Message msg = messages[i];
            JsonObject item = new JsonObject();

            Address[] from = msg.getFrom();
            item.addProperty("send", from != null && from.length > 0 ? from[0].toString() : "");
            item.addProperty("subject", msg.getSubject() != null ? msg.getSubject() : "");
            item.addProperty("date", msg.getSentDate() != null ? msg.getSentDate().toString() : "");

            String textBody = "", htmlBody = "";
            Object content = msg.getContent();
            if (content instanceof String) {
                if (msg.isMimeType("text/html")) htmlBody = (String) content;
                else textBody = (String) content;
            } else if (content instanceof Multipart) {
                Multipart mp = (Multipart) content;
                for (int j = 0; j < mp.getCount(); j++) {
                    BodyPart bp = mp.getBodyPart(j);
                    if (bp.isMimeType("text/plain") && textBody.isEmpty()) {
                        Object c = bp.getContent();
                        if (c instanceof String) textBody = (String) c;
                    }
                    if (bp.isMimeType("text/html") && htmlBody.isEmpty()) {
                        Object c = bp.getContent();
                        if (c instanceof String) htmlBody = (String) c;
                    }
                }
            }
            item.addProperty("text", textBody);
            item.addProperty("html", htmlBody);
            arr.add(item);
        }

        folder.close(false);
        store.close();
        return arr.toString();
    }

    // ========================================================================
    // /api/renew-token — exchange refresh_token for a new one
    // ========================================================================

    private Response handleRenewToken(IHTTPSession session) {
        try {
            String body = readRequestBody(session);
            JsonObject req = JsonParser.parseString(body).getAsJsonObject();

            String email = req.has("email") ? req.get("email").getAsString() : "";
            String clientId = req.has("clientId") ? req.get("clientId").getAsString() : "";
            String oldRefreshToken = req.has("refreshToken") ? req.get("refreshToken").getAsString() : "";

            if (email.isEmpty() || clientId.isEmpty() || oldRefreshToken.isEmpty()) {
                return newJsonResponse(Response.Status.BAD_REQUEST,
                        errorJson("Missing required fields"));
            }

            // Exchange token
            RequestBody formBody = new FormBody.Builder()
                    .add("client_id", clientId)
                    .add("refresh_token", oldRefreshToken)
                    .add("grant_type", "refresh_token")
                    .build();

            Request request = new Request.Builder()
                    .url(OAUTH2_URL)
                    .post(formBody)
                    .build();

            okhttp3.Response oauthResp = httpClient.newCall(request).execute();
            String respBody = oauthResp.body() != null ? oauthResp.body().string() : "";

            if (!oauthResp.isSuccessful()) {
                oauthResp.close();
                JsonObject errObj = new JsonObject();
                errObj.addProperty("error", "Token renewal failed — token may be expired or revoked");
                errObj.addProperty("detail", respBody.length() > 200 ? respBody.substring(0, 200) : respBody);
                return newJsonResponse(Response.Status.UNAUTHORIZED, gson.toJson(errObj));
            }
            oauthResp.close();

            JsonObject tokenData = JsonParser.parseString(respBody).getAsJsonObject();
            String newRefreshToken = tokenData.has("refresh_token") ? tokenData.get("refresh_token").getAsString() : "";
            String newAccessToken = tokenData.has("access_token") ? tokenData.get("access_token").getAsString() : "";

            if (newRefreshToken.isEmpty()) {
                return newJsonResponse(Response.Status.INTERNAL_ERROR,
                        errorJson("No new refresh_token returned"));
            }

            // Verify new token works (read 1 mail)
            boolean mailOk = false;
            try {
                String testUrl = "https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$top=1&$select=subject";
                Request testReq = new Request.Builder()
                        .url(testUrl)
                        .addHeader("Authorization", "Bearer " + newAccessToken)
                        .get()
                        .build();
                okhttp3.Response testResp = httpClient.newCall(testReq).execute();
                mailOk = testResp.isSuccessful();
                testResp.close();
            } catch (Exception ignored) {}

            // Get current UTC time
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
            String nowIso = sdf.format(new Date());

            // Update accounts.json
            synchronized (this) {
                List<JsonObject> accounts = readAccountsList();
                for (JsonObject a : accounts) {
                    if (a.has("email") && a.get("email").getAsString().equals(email)) {
                        a.addProperty("refreshToken", newRefreshToken);
                        a.addProperty("tokenRenewedAt", nowIso);
                        break;
                    }
                }
                writeAccountsList(accounts);
            }

            JsonObject result = new JsonObject();
            result.addProperty("success", true);
            result.addProperty("newRefreshToken", newRefreshToken);
            result.addProperty("tokenRenewedAt", nowIso);
            result.addProperty("mailAccessOk", mailOk);
            return newJsonResponse(Response.Status.OK, gson.toJson(result));

        } catch (Exception e) {
            e.printStackTrace();
            return newJsonResponse(Response.Status.INTERNAL_ERROR,
                    errorJson("Server error: " + e.getMessage()));
        }
    }

    // ========================================================================
    // /api/accounts — GET / POST
    // ========================================================================

    private Response handleGetAccounts() {
        try {
            String json = readFileContent(accountsFile);
            if (json == null || json.trim().isEmpty()) {
                return newJsonResponse(Response.Status.OK, "[]");
            }
            return newJsonResponse(Response.Status.OK, json);
        } catch (Exception e) {
            return newJsonResponse(Response.Status.OK, "[]");
        }
    }

    private Response handlePostAccounts(IHTTPSession session) {
        try {
            String body = readRequestBody(session);
            // Validate it's valid JSON array
            JsonParser.parseString(body).getAsJsonArray();
            writeFileContent(accountsFile, body);
            return newJsonResponse(Response.Status.OK, "{\"ok\":true}");
        } catch (Exception e) {
            return newJsonResponse(Response.Status.INTERNAL_ERROR,
                    errorJson("Failed to save accounts: " + e.getMessage()));
        }
    }

    // ========================================================================
    // /api/groups — GET / POST
    // ========================================================================

    private Response handleGetGroups() {
        try {
            String json = readFileContent(groupsFile);
            if (json == null || json.trim().isEmpty()) {
                return newJsonResponse(Response.Status.OK, "[]");
            }
            return newJsonResponse(Response.Status.OK, json);
        } catch (Exception e) {
            return newJsonResponse(Response.Status.OK, "[]");
        }
    }

    private Response handlePostGroups(IHTTPSession session) {
        try {
            String body = readRequestBody(session);
            JsonParser.parseString(body).getAsJsonArray();
            writeFileContent(groupsFile, body);
            return newJsonResponse(Response.Status.OK, "{\"ok\":true}");
        } catch (Exception e) {
            return newJsonResponse(Response.Status.INTERNAL_ERROR,
                    errorJson("Failed to save groups: " + e.getMessage()));
        }
    }

    // ========================================================================
    // /api/export — generate txt backup
    // ========================================================================

    private Response handleExport() {
        try {
            List<JsonObject> accounts = readAccountsList();
            StringBuilder sb = new StringBuilder();
            for (JsonObject a : accounts) {
                String email = a.has("email") ? a.get("email").getAsString() : "";
                String password = a.has("password") ? a.get("password").getAsString() : "";
                String clientId = a.has("clientId") ? a.get("clientId").getAsString() : "";
                String refreshToken = a.has("refreshToken") ? a.get("refreshToken").getAsString() : "";
                sb.append(email).append("----")
                        .append(password).append("----")
                        .append(clientId).append("----")
                        .append(refreshToken).append("\n");
            }

            String content = sb.toString();
            byte[] bytes = content.getBytes("UTF-8");

            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            String dateStr = sdf.format(new Date());
            String filename = "邮箱列表_" + dateStr + ".txt";
            String encodedFilename = URLEncoder.encode(filename, "UTF-8").replace("+", "%20");

            Response resp = newFixedLengthResponse(Response.Status.OK,
                    "text/plain; charset=utf-8",
                    new java.io.ByteArrayInputStream(bytes), bytes.length);
            resp.addHeader("Content-Disposition",
                    "attachment; filename*=UTF-8''" + encodedFilename);
            resp.addHeader("Access-Control-Allow-Origin", "*");
            return resp;

        } catch (Exception e) {
            return newJsonResponse(Response.Status.INTERNAL_ERROR,
                    errorJson("Export failed: " + e.getMessage()));
        }
    }

    // ========================================================================
    // /api/import — import from posted data
    // ========================================================================

    private Response handleImport(IHTTPSession session) {
        try {
            String body = readRequestBody(session);
            // Expect a JSON object with "content" field or raw text
            String text;
            try {
                JsonObject obj = JsonParser.parseString(body).getAsJsonObject();
                text = obj.has("content") ? obj.get("content").getAsString() : body;
            } catch (Exception e) {
                text = body;
            }

            List<JsonObject> existing = readAccountsList();
            Map<String, Boolean> existingEmails = new HashMap<>();
            for (JsonObject a : existing) {
                if (a.has("email")) {
                    existingEmails.put(a.get("email").getAsString(), true);
                }
            }

            String[] lines = text.split("\n");
            for (String line : lines) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] parts = line.split("----");
                if (parts.length < 4) continue;

                String email = parts[0].trim();
                if (existingEmails.containsKey(email)) continue;

                existingEmails.put(email, true);
                JsonObject account = new JsonObject();
                account.addProperty("email", email);
                account.addProperty("password", parts[1].trim());
                account.addProperty("clientId", parts[2].trim());
                account.addProperty("refreshToken", parts[3].trim());
                account.addProperty("group", "未分组");
                account.addProperty("tokenStatus", "");
                account.addProperty("permissionType", "");
                existing.add(account);
            }

            writeAccountsList(existing);
            return newJsonResponse(Response.Status.OK, gson.toJson(existing));

        } catch (Exception e) {
            return newJsonResponse(Response.Status.INTERNAL_ERROR,
                    errorJson("Import failed: " + e.getMessage()));
        }
    }

    // ========================================================================
    // File I/O helpers
    // ========================================================================

    private synchronized List<JsonObject> readAccountsList() {
        try {
            String content = readFileContent(accountsFile);
            if (content == null || content.trim().isEmpty()) {
                return new ArrayList<>();
            }
            JsonArray arr = JsonParser.parseString(content).getAsJsonArray();
            List<JsonObject> list = new ArrayList<>();
            for (JsonElement elem : arr) {
                if (elem.isJsonObject()) {
                    list.add(elem.getAsJsonObject());
                }
            }
            return list;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private synchronized void writeAccountsList(List<JsonObject> accounts) {
        try {
            JsonArray arr = new JsonArray();
            for (JsonObject obj : accounts) {
                arr.add(obj);
            }
            writeFileContent(accountsFile, gson.toJson(arr));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String readFileContent(File file) {
        if (!file.exists()) return null;
        try {
            StringBuilder sb = new StringBuilder();
            BufferedReader br = new BufferedReader(new FileReader(file));
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line).append("\n");
            }
            br.close();
            return sb.toString().trim();
        } catch (IOException e) {
            return null;
        }
    }

    private void writeFileContent(File file, String content) throws IOException {
        FileWriter fw = new FileWriter(file);
        fw.write(content);
        fw.close();
    }

    private String readRequestBody(IHTTPSession session) throws IOException, ResponseException {
        // NanoHTTPD requires parsing the body into files map for POST
        Map<String, String> bodyMap = new HashMap<>();
        session.parseBody(bodyMap);

        // For application/json, the body is in "postData" key
        String body = bodyMap.get("postData");
        if (body != null) return body;

        // Fallback: try reading from the map values
        for (String value : bodyMap.values()) {
            if (value != null && !value.isEmpty()) {
                return value;
            }
        }

        return "";
    }

    // ========================================================================
    // Response helpers
    // ========================================================================

    private Response newJsonResponse(Response.Status status, String json) {
        Response resp = newFixedLengthResponse(status, "application/json; charset=utf-8", json);
        resp.addHeader("Access-Control-Allow-Origin", "*");
        resp.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        resp.addHeader("Access-Control-Allow-Headers", "Content-Type");
        return resp;
    }

    private String errorJson(String message) {
        JsonObject obj = new JsonObject();
        obj.addProperty("error", message);
        return gson.toJson(obj);
    }

    // ========================================================================
    // Custom exception
    // ========================================================================

    private static class GraphAuthException extends Exception {
        GraphAuthException(String message) {
            super(message);
        }
    }
}
