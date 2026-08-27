import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class Main {
    public static void main(String[] args) throws Exception {
        int port = 1375;
        if (args.length > 0) {
            try { port = Integer.parseInt(args[0]); } catch (NumberFormatException ignored) {}
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());

        final PcServer pcServer = new PcServer();
        server.createContext("/", pcServer::handle);

        pcServer.log("INFO", "========================================");
        pcServer.log("INFO", "MailPilot PC 服务启动");
        pcServer.log("INFO", "监听端口: " + port);
        pcServer.log("INFO", "访问地址: http://localhost:" + port + "/");
        pcServer.log("INFO", "========================================");

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            pcServer.log("INFO", "========================================");
            pcServer.log("INFO", "MailPilot PC 服务正在关闭...");
            pcServer.closeLogger();
            pcServer.log("INFO", "服务已停止");
            pcServer.log("INFO", "========================================");
        }));

        server.start();

        System.out.println("\n✅ MailPilot PC 已启动: http://localhost:" + port);
        System.out.println("📁 日志文件: " + pcServer.getCurrentLogFile());
        System.out.println("\n按 Ctrl+C 停止服务...\n");

        Thread.currentThread().join();
    }
}