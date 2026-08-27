@rem Gradle wrapper script that uses locally cached Gradle distribution
@rem Downloads distribution if not yet cached
@rem
@rem Arguments: same as `gradle` command

@if "%DEBUG%"=="" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
@rem This is normally unused.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Resolve "." and ".." in APP_HOME to make it shorter.
for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi

@rem Add default JVM options here.
set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"

@rem Read wrapper properties for distribution URL
set WRAPPER_PROPERTIES_PATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.properties
set DISTRIBUTION_URL=
if exist "%WRAPPER_PROPERTIES_PATH%" (
    for /f "tokens=2 delims==" %%a in ('type "%WRAPPER_PROPERTIES_PATH%" ^| findstr "distributionUrl"') do (
        set DISTRIBUTION_URL=%%a
    )
)

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto execute

echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo Please set the JAVA_HOME variable in your environment to match the location of your Java installation.
goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo Please set the JAVA_HOME variable in your environment to match the location of your Java installation.
goto fail

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar

@rem If wrapper jar exists, use it; otherwise try to find cached Gradle
if exist "%CLASSPATH%" goto runWithWrapperJar

@rem Direct fallback: look for cached Gradle in user home
set GRADLE_USER_HOME=%USERPROFILE%\.gradle
if not defined GRADLE_USER_HOME goto noWrapper

@rem Try to find the gradle-launcher jar in the wrapper dists cache
for /d %%d in ("%GRADLE_USER_HOME%\wrapper\dists\gradle-8.9-bin\*") do (
    if exist "%%d\gradle-8.9\lib\gradle-launcher-8.9.jar" (
        set CLASSPATH=%%d\gradle-8.9\lib\gradle-launcher-8.9.jar
        set GRADLE_OPTS=-Dgradle.user.home="%GRADLE_USER_HOME%"
        goto runWithWrapperJar
    )
)

:noWrapper
echo ERROR: Could not find gradle-wrapper.jar or cached Gradle distribution.
echo Please run 'gradle wrapper' to generate the wrapper files, or install Gradle.
goto fail

:runWithWrapperJar
@rem Execute Gradle
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" org.gradle.launcher.GradleMain %*

:end
@rem End local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" endlocal

:omega
exit /b %ERRORLEVEL%

:fail
rem Set variable GRADLE_EXIT_CONSOLE if you need the _script_ to wait
cmd /c exit /b 1
exit /b 1
