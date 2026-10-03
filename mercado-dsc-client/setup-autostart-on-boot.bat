@echo off
title SSPACIA DSC Gateway - One-Time Autostart Setup
color 0A

echo ====================================================================
echo      SSPACIA USB DSC GATEWAY - ONE-TIME AUTOSTART SETUP
echo ====================================================================
echo.
echo This sets up the DSC Gateway to run automatically and silently
echo in the background whenever this computer boots up or logs in.
echo.
echo The Mercado CM will NEVER need to open folders or double-click.
echo She only needs to insert the USB token!
echo.

set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_VBS=%STARTUP_DIR%\SSPACIA_DSC_Gateway.vbs

echo 1. Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    py --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python is not installed or not in PATH!
        echo Please download and install Python 3.10+ from python.org and check "Add to PATH".
        pause
        exit /b 1
    )
)

echo 2. Installing required signing libraries (pyhanko, python-pkcs11, requests, tzlocal)...
pip install pyhanko python-pkcs11 requests tzlocal cryptography >nul 2>&1

echo 3. Creating background autostart script in:
echo "%STARTUP_DIR%"
echo.

(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%SCRIPT_DIR%"
echo WshShell.Run "cmd /c pyw sspacia-dsc-gateway.py || pythonw sspacia-dsc-gateway.py || py sspacia-dsc-gateway.py || python sspacia-dsc-gateway.py", 0, False
) > "%SHORTCUT_VBS%"

echo [SUCCESS] Autostart configured successfully!
echo.
echo Starting the gateway in the background right now...
wscript "%SHORTCUT_VBS%"

echo.
echo ====================================================================
echo [DONE] The gateway is now running silently in the background!
echo Whenever this PC turns on, it starts automatically.
echo Just insert the USB token whenever signing is needed.
echo ====================================================================
echo.
pause
