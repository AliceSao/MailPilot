@echo off
chcp 65001 >nul
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo ============================================
echo   MailPilot PC - 邮箱管理系统
echo ============================================
echo.

:: 检查Java环境
java -version >nul 2>&1
if !errorlevel! neq 0 (
    echo [错误] 未找到Java运行环境，请安装JDK 21+
    echo 下载地址: https://adoptium.net/
    pause
    exit /b 1
)

:: 创建必要目录
if not exist "output" mkdir output

:: 检查静态文件
if not exist "static\index.html" (
    echo [警告] 缺少 static\index.html，请确保静态文件存在
)

:: 解析参数
set PORT=1375
set FORCE_COMPILE=0

:parse_args
if "%1"=="" goto args_done
if "%1"=="-recompile" set FORCE_COMPILE=1
if "%1"=="-r" set FORCE_COMPILE=1
echo %1 | findstr /r "^[0-9][0-9]*$" >nul
if not errorlevel 1 set PORT=%1
shift
goto parse_args
:args_done

:: 编译检查
if not exist "out" set FORCE_COMPILE=1
if !FORCE_COMPILE! equ 1 (
    echo [信息] 需要编译，调用 compile.bat ...
    echo.
    call compile.bat
    if !errorlevel! neq 0 (
        echo.
        echo [错误] 编译失败，无法启动服务
        pause
        exit /b 1
    )
    echo.
) else (
    echo [信息] 使用已有编译结果（使用 -recompile 参数强制重编译）
    echo.
)

echo [信息] 正在启动服务...
echo [信息] 端口: %PORT%
echo [信息] 访问地址: http://localhost:%PORT%
echo [信息] 按 Ctrl+C 停止服务
echo.

java -cp "lib\*;out" Main %PORT%

if !errorlevel! neq 0 (
    echo.
    echo [错误] 服务启动失败，请检查上述错误信息
    pause
)