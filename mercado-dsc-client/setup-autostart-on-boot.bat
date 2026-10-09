@echo off
setlocal EnableDelayedExpansion
title SSPACIA DSC Gateway - Automated Setup (Accountant Laptop)
color 0B

echo ====================================================================
echo      SSPACIA USB DSC GATEWAY - ONE-TIME AUTOMATED SETUP
echo ====================================================================
echo.
echo This script sets up the USB DSC Gateway to automatically and
echo silently sign invoices in the background on this laptop.
echo.
echo No Python installed? No problem!
echo This installer will automatically download and configure everything.
echo.

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_VBS=%STARTUP_DIR%\SSPACIA_DSC_Gateway.vbs"

echo ====================================================================
echo [STEP 1/4] Checking Python installation...
echo ====================================================================

set "PY_EXE="
set "PYW_EXE="

:: 1. Check if py launcher works (standard on Windows)
where py >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%p in ('py -c "import sys; print(sys.executable)" 2^>nul') do (
        if exist "%%p" set "PY_EXE=%%p"
    )
)

:: 2. Check if python in PATH works
if not defined PY_EXE (
    python -V >nul 2>&1
    if not errorlevel 1 (
        for /f "delims=" %%p in ('python -c "import sys; print(sys.executable)" 2^>nul') do (
            if exist "%%p" set "PY_EXE=%%p"
        )
    )
)

:: 3. Check standard install directories
if not defined PY_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
if not defined PY_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not defined PY_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PY_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if not defined PY_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
if not defined PY_EXE if exist "%ProgramFiles%\Python314\python.exe" set "PY_EXE=%ProgramFiles%\Python314\python.exe"
if not defined PY_EXE if exist "%ProgramFiles%\Python313\python.exe" set "PY_EXE=%ProgramFiles%\Python313\python.exe"
if not defined PY_EXE if exist "%ProgramFiles%\Python312\python.exe" set "PY_EXE=%ProgramFiles%\Python312\python.exe"
if not defined PY_EXE if exist "%ProgramFiles%\Python311\python.exe" set "PY_EXE=%ProgramFiles%\Python311\python.exe"

if defined PY_EXE (
    echo [OK] Python found: !PY_EXE!
    goto :PYTHON_READY
)

echo [INFO] Python is NOT installed on this laptop.
echo [INFO] Automatically downloading official Python 3.11 for Windows...
echo [INFO] Please wait a moment...
echo.

set "PY_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
if "%PROCESSOR_ARCHITECTURE%"=="x86" (
    if not defined PROCESSOR_ARCHITEW6432 (
        set "PY_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9.exe"
    )
)

set "TEMP_INSTALLER=%TEMP%\python_installer_%RANDOM%.exe"

:: Try curl first (built into Windows 10/11)
curl.exe --version >nul 2>&1
if not errorlevel 1 (
    echo Downloading from: %PY_URL%
    curl.exe -L --fail --progress-bar "%PY_URL%" -o "%TEMP_INSTALLER%"
)

:: Fallback to Windows PowerShell if curl did not succeed
if not exist "%TEMP_INSTALLER%" (
    echo Downloading via Windows PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%PY_URL%', '%TEMP_INSTALLER%')"
)

if not exist "%TEMP_INSTALLER%" (
    echo [ERROR] Could not download Python automatically.
    echo Please verify your internet connection or install Python from python.org.
    pause
    exit /b 1
)

echo.
echo [INFO] Installing Python silently for the current user...
echo [INFO] (No admin password required, takes ~30 seconds)...
"%TEMP_INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 SimpleInstall=1
del /f /q "%TEMP_INSTALLER%" >nul 2>&1

:: Refresh session PATH
set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"

if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
) else (
    where python >nul 2>&1
    if not errorlevel 1 for /f "delims=" %%I in ('where python 2^>nul') do if not defined PY_EXE set "PY_EXE=%%I"
)

if not defined PY_EXE (
    echo [ERROR] Python installation did not finish cleanly.
    echo Please run this script again or install Python manually.
    pause
    exit /b 1
)

echo [SUCCESS] Python successfully installed: !PY_EXE!

:PYTHON_READY
echo.
echo ====================================================================
echo [STEP 2/4] Installing required signing libraries...
echo ====================================================================
echo Installing pyhanko, python-pkcs11, requests, tzlocal, cryptography...
"!PY_EXE!" -m pip install --upgrade --no-warn-script-location pyhanko python-pkcs11 requests tzlocal cryptography

if errorlevel 1 (
    echo [WARNING] Retrying pip install...
    "!PY_EXE!" -m pip install --no-cache-dir pyhanko python-pkcs11 requests tzlocal cryptography
)

echo.
echo ====================================================================
echo [STEP 3/4] Locating background runner (pythonw)...
echo ====================================================================

if exist "%LOCALAPPDATA%\Programs\Python\Python311\pythonw.exe" (
    set "PYW_EXE=%LOCALAPPDATA%\Programs\Python\Python311\pythonw.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\pythonw.exe" (
    set "PYW_EXE=%LOCALAPPDATA%\Programs\Python\Python312\pythonw.exe"
) else (
    set "CANDIDATE=!PY_EXE:python.exe=pythonw.exe!"
    if exist "!CANDIDATE!" (
        set "PYW_EXE=!CANDIDATE!"
    ) else (
        where pythonw >nul 2>&1
        if not errorlevel 1 (
            for /f "delims=" %%I in ('where pythonw 2^>nul') do if not defined PYW_EXE set "PYW_EXE=%%I"
        ) else (
            set "PYW_EXE=!PY_EXE!"
        )
    )
)

echo Runner: !PYW_EXE!

:: Stop any previous background instances
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*sspacia-dsc-gateway.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo.
echo ====================================================================
echo [STEP 4/4] Setting up Windows Startup (Silent Autostart on Boot)...
echo ====================================================================

(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%SCRIPT_DIR%"
echo WshShell.Run """!PYW_EXE!"" ""%SCRIPT_DIR%\sspacia-dsc-gateway.py""", 0, False
) > "%SHORTCUT_VBS%"

echo [OK] Created Windows autostart entry:
echo "%SHORTCUT_VBS%"
echo.
echo Starting the gateway silently in background right now...
wscript "%SHORTCUT_VBS%"

echo.
echo ====================================================================
echo [DONE!] SETUP COMPLETE - THE GATEWAY IS NOW RUNNING!
echo ====================================================================
echo.
echo  1. The SSPACIA USB DSC Gateway is now running in the background.
echo  2. It starts automatically whenever this laptop boots up.
echo  3. When an invoice needs to be digitally signed, simply insert
echo     your USB DSC Token into any USB port on this laptop.
echo  4. If your token PIN is different from "PASSWORD", edit "dsc_pin.txt".
echo  5. To verify or test live, run "test-gateway-visible.bat".
echo.
echo ====================================================================
pause
