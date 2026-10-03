@echo off
title SSPACIA DSC Gateway - Uninstall Autostart
color 0C

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_VBS=%STARTUP_DIR%\SSPACIA_DSC_Gateway.vbs

if exist "%SHORTCUT_VBS%" (
    del /f /q "%SHORTCUT_VBS%"
    echo [OK] Removed SSPACIA DSC Gateway from Windows Startup!
) else (
    echo [INFO] Gateway was not found in Windows Startup.
)

taskkill /F /IM pythonw.exe 2>nul
taskkill /F /IM pyw.exe 2>nul
echo [OK] Background processes stopped.
echo.
pause
