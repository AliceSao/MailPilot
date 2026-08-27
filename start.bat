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
if not exist "pc\output" mkdir pc\output

:: 检查静态文件
if not exist "pc\static\index.html" (
    echo [警告] 缺少 pc\static\index.html，请确保静态文件存在
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
if not exist "pc\out" set FORCE_COMPILE=1
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
)

:: 启动服务
echo ============================================
echo [信息] 启动服务...
echo [信息] 端口: !PORT!
echo [信息] 访问地址: http://localhost:!PORT!/
echo ============================================
echo.

:: 设置工作目录为pc目录，确保静态文件路径正确
cd /d "%~dp0pc"

:: 后台启动Java服务，然后打开浏览器
start "" java -cp "out;lib\*" Main !PORT!

:: 等待1秒让服务启动
timeout /t 1 /nobreak >nul

:: 自动打开默认浏览器
echo [信息] 正在打开浏览器...
start http://localhost:!PORT!/

echo.
echo [提示] 服务已在后台运行，按任意键停止服务...
pause >nul

:: 停止服务（关闭java进程）
taskkill /f /im java.exe >nul 2>&1

endlocal