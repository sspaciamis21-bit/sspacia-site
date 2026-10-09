@echo off
setlocal EnableDelayedExpansion
title SSPACIA USB DSC Gateway - Live Console Test
color 0A
cd /d "%~dp0"

echo ====================================================================
echo        SSPACIA USB DSC GATEWAY - LIVE CONSOLE TEST
echo ====================================================================
echo.

set "PY_CMD="

:: Detect python
where py >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%p in ('py -c "import sys; print(sys.executable)" 2^>nul') do (
        if exist "%%p" set "PY_CMD=%%p"
    )
)
if not defined PY_CMD (
    python -V >nul 2>&1
    if not errorlevel 1 set "PY_CMD=python"
)
if not defined PY_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
if not defined PY_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not defined PY_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PY_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if not defined PY_CMD if exist "%ProgramFiles%\Python314\python.exe" set "PY_CMD=%ProgramFiles%\Python314\python.exe"
if not defined PY_CMD if exist "%ProgramFiles%\Python312\python.exe" set "PY_CMD=%ProgramFiles%\Python312\python.exe"
if not defined PY_CMD if exist "%ProgramFiles%\Python311\python.exe" set "PY_CMD=%ProgramFiles%\Python311\python.exe"

if not defined PY_CMD (
    echo [ERROR] Python not found on this system!
    echo Please double-click 'setup-autostart-on-boot.bat' first.
    echo It will automatically install Python and set up everything.
    echo.
    pause
    exit /b 1
)

echo [OK] Using Python: !PY_CMD!
echo.
echo Make sure your Watchdata / ProxKey / ePass USB Token is plugged in!
echo Connecting to https://sspacia.com ...
echo.

"!PY_CMD!" sspacia-dsc-gateway.py --server https://sspacia.com --center Mercado
pause
