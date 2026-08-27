import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;

public class StaticFileHandler {
    private static final Map<String, String> MIME_TYPES = new HashMap<>();
    static {
        MIME_TYPES.put("html", "text/html; charset=UTF-8");
        MIME_TYPES.put("css", "text/css; charset=UTF-8");
        MIME_TYPES.put("js", "application/javascript; charset=UTF-8");
        MIME_TYPES.put("json", "application/json; charset=UTF-8");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("gif", "image/gif");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("ico", "image/x-icon");
        MIME_TYPES.put("txt", "text/plain; charset=UTF-8");
        MIME_TYPES.put("csv", "text/csv; charset=UTF-8");
    }

    private final String staticDir;
    private final String canonicalBase;

    public StaticFileHandler(String staticDir) {
        this.staticDir = staticDir;
        // 预计算静态目录的规范化路径，用于路径遍历防护
        String base;
        try {
            base = new File(staticDir).getCanonicalPath();
        } catch (IOException e) {
            base = new File(staticDir).getAbsolutePath();
        }
        this.canonicalBase = base;
    }

    public void serve(HttpExchange exchange, String path) throws IOException {
        if ("/".equals(path)) {
            path = "/index.html";
        }

        // 路径遍历防护：规范化后校验起始路径
        File file = new File(staticDir, path).getCanonicalFile();
        if (!file.getPath().startsWith(canonicalBase)) {
            String body = "<h1>403 Forbidden</h1>";
            exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(403, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.getResponseBody().close();
            return;
        }

        if (!file.exists() || file.isDirectory()) {
            // 回退到index.html时同样需要路径校验
            file = new File(staticDir, "index.html").getCanonicalFile();
        }

        if (!file.exists()) {
            String body = "<h1>404 Not Found</h1>";
            exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(404, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.getResponseBody().close();
            return;
        }

        String fileName = file.getName();
        String ext = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase() : "";
        String mime = MIME_TYPES.getOrDefault(ext, "application/octet-stream");

        exchange.getResponseHeaders().set("Content-Type", mime);
        byte[] content = Files.readAllBytes(file.toPath());
        exchange.sendResponseHeaders(200, content.length);
        exchange.getResponseBody().write(content);
        exchange.getResponseBody().close();
    }
}