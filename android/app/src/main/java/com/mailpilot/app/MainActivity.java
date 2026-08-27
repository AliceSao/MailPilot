package com.mailpilot.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private WebView webView;
    private LocalServer server;
    private ValueCallback<Uri[]> fileUploadCallback;
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private SharedPreferences prefs;
    private static final String PREFS_NAME = "mailpilot_prefs";
    private static final String KEY_DEFAULT_BROWSER_PKG = "default_browser_pkg";
    private static final String KEY_DEFAULT_BROWSER_NAME = "default_browser_name";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);

        server = new LocalServer(1375, this);
        try {
            server.start();
        } catch (Exception e) {
            e.printStackTrace();
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setAllowFileAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("http://localhost:1375/") || url.startsWith("http://127.0.0.1:1375/")) {
                    return false;
                }
                openInExternalBrowser(url);
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http://localhost:1375/") || url.startsWith("http://127.0.0.1:1375/")) {
                    return false;
                }
                openInExternalBrowser(url);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                android.app.DownloadManager.Request request = new android.app.DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimetype);
                String filename = "mailpilot_export.txt";
                if (contentDisposition != null && contentDisposition.contains("filename")) {
                    try {
                        filename = contentDisposition.split("filename\\*?=")[1].replace("UTF-8''", "").replace("\"", "").trim();
                        filename = java.net.URLDecoder.decode(filename, "UTF-8");
                    } catch (Exception e) { /* use default */ }
                }
                request.addRequestHeader("User-Agent", userAgent);
                request.setTitle(filename);
                request.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, filename);
                android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                dm.enqueue(request);
                Toast.makeText(getApplicationContext(), "保存到 Downloads/" + filename, Toast.LENGTH_SHORT).show();
            }
        });

        webView.loadUrl("http://localhost:1375/");
    }

    private void openInExternalBrowser(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            String pkg = prefs.getString(KEY_DEFAULT_BROWSER_PKG, null);
            if (pkg != null && isPackageInstalled(pkg)) {
                intent.setPackage(pkg);
            }

            startActivity(intent);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(fallback);
            } catch (Exception ex) {
                Toast.makeText(this, "无法打开链接: " + url, Toast.LENGTH_SHORT).show();
            }
        }
    }

    private boolean isPackageInstalled(String pkg) {
        try {
            getPackageManager().getPackageInfo(pkg, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    public class AndroidBridge {

        @JavascriptInterface
        public void openExternalLink(String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    openInExternalBrowser(url);
                }
            });
        }

        @JavascriptInterface
        public void pickDefaultBrowser() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    showBrowserPicker();
                }
            });
        }

        @JavascriptInterface
        public String getDefaultBrowserName() {
            return prefs.getString(KEY_DEFAULT_BROWSER_NAME, "");
        }

        @JavascriptInterface
        public void clearDefaultBrowser() {
            prefs.edit().remove(KEY_DEFAULT_BROWSER_PKG).remove(KEY_DEFAULT_BROWSER_NAME).apply();
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, "已清除默认浏览器，将跟随系统", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    private void showBrowserPicker() {
        PackageManager pm = getPackageManager();
        Intent baseIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.example.com"));
        List<ResolveInfo> browsers = pm.queryIntentActivities(baseIntent, PackageManager.MATCH_DEFAULT_ONLY);

        final List<String> names = new ArrayList<>();
        final List<String> pkgs = new ArrayList<>();

        for (ResolveInfo ri : browsers) {
            names.add(ri.loadLabel(pm).toString());
            pkgs.add(ri.activityInfo.packageName);
        }

        names.add("跟随系统默认");
        pkgs.add("");

        final String[] nameArray = names.toArray(new String[0]);

        new android.app.AlertDialog.Builder(this)
            .setTitle("选择默认浏览器")
            .setItems(nameArray, new android.content.DialogInterface.OnClickListener() {
                @Override
                public void onClick(android.content.DialogInterface dialog, int which) {
                    String selectedPkg = pkgs.get(which);
                    if (selectedPkg.isEmpty()) {
                        prefs.edit().remove(KEY_DEFAULT_BROWSER_PKG).remove(KEY_DEFAULT_BROWSER_NAME).apply();
                        Toast.makeText(MainActivity.this, "已设为跟随系统默认", Toast.LENGTH_SHORT).show();
                    } else {
                        prefs.edit()
                            .putString(KEY_DEFAULT_BROWSER_PKG, selectedPkg)
                            .putString(KEY_DEFAULT_BROWSER_NAME, names.get(which))
                            .apply();
                        Toast.makeText(MainActivity.this, "默认浏览器: " + names.get(which), Toast.LENGTH_SHORT).show();
                    }
                    webView.evaluateJavascript("if(typeof onBrowserChanged==='function')onBrowserChanged('" + names.get(which).replace("'", "\\'") + "')", null);
                }
            })
            .show();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
            }
            if (fileUploadCallback != null) {
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (server != null) server.stop();
        super.onDestroy();
    }
}
