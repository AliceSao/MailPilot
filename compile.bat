@echo off
chcp 65001 >nul
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo ============================================
echo   MailPilot PC - 编译工具
echo ============================================
echo.

:: 检查Java环境
java -version >nul 2>&1
if !errorlevel! neq 0 (
    echo [错误] 未找到Java运行环境，请安装JDK 21+
    echo 下载地址: https://adoptium.net/
    exit /b 1
)

for /f "tokens=3" %%i in ('java -version 2^>^&1 ^| findstr /i "version"') do (
    echo [信息] Java版本: %%i
)
echo.

:: 检查依赖库
set MISSING=0
if not exist "pc\lib\okhttp-4.12.0.jar" (
    echo [缺少] okhttp-4.12.0.jar
    set MISSING=1
)
if not exist "pc\lib\okio-jvm-3.9.0.jar" (
    echo [缺少] okio-jvm-3.9.0.jar
    set MISSING=1
)
if not exist "pc\lib\gson-2.10.1.jar" (
    echo [缺少] gson-2.10.1.jar
    set MISSING=1
)
if not exist "pc\lib\mailapi-1.6.7.jar" (
    echo [缺少] mailapi-1.6.7.jar
    set MISSING=1
)
if not exist "pc\lib\imap-1.6.7.jar" (
    echo [缺少] imap-1.6.7.jar
    set MISSING=1
)
if not exist "pc\lib\activation-1.1.1.jar" (
    echo [缺少] activation-1.1.1.jar
    set MISSING=1
)

if !MISSING! equ 1 (
    echo.
    echo [错误] 缺少依赖库，无法编译
    echo 下载地址:
    echo   OkHttp      : https://mvnrepository.com/artifact/com.squareup.okhttp3/okhttp/4.12.0
    echo   Okio JVM    : https://mvnrepository.com/artifact/com.squareup.okio/okio-jvm/3.9.0
    echo   Gson        : https://mvnrepository.com/artifact/com.google.code.gson/gson/2.10.1
    echo   JavaMail API: https://mvnrepository.com/artifact/com.sun.mail/mailapi/1.6.7
    echo   JavaMail IMAP: https://mvnrepository.com/artifact/com.sun.mail/imap/1.6.7
    echo   Activation  : https://mvnrepository.com/artifact/javax.activation/activation/1.1.1
    exit /b 1
)

:: 检查源码
if not exist "pc\src\*.java" (
    echo [错误] pc\src\ 目录下没有Java源文件
    exit /b 1
)

:: 编译
echo [信息] 正在编译Java源文件...
echo.
if not exist "pc\out" mkdir pc\out

javac -encoding UTF-8 -Xlint:-deprecation -cp "pc\lib\*" -d pc\out pc\src\*.java
if !errorlevel! neq 0 (
    echo.
    echo [错误] 编译失败，请检查上述错误信息
    exit /b 1
)

echo [信息] 编译成功
echo [信息] 输出目录: pc\out\
exit /b 0