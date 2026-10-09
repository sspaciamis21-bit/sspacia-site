@echo off
title SSPACIA USB DSC Gateway - Mercado Host
color 0A

echo ====================================================================
echo        SSPACIA USB DSC REMOTE SIGNING GATEWAY (MERCADO HOST)
echo ====================================================================
echo.
echo Make sure your Watchdata / ProxKey USB Token is plugged into this PC.
echo.

set SERVER_URL=https://sspacia.com

if "%1"=="--local" (
    set SERVER_URL=http://localhost:3000
    echo [MODE] Connecting to LOCAL DEVELOPMENT server: http://localhost:3000
) else (
    echo [MODE] Connecting to PRODUCTION server: %SERVER_URL%
    echo ^(To connect to local dev instead, run: start-mercado-gateway.bat --local^)
)
echo Checking Python environment...
set PY_CMD=
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

if "%PY_CMD%"=="" (
    echo [INFO] Python is not installed. Automatically downloading Python 3.11...
    set "TEMP_INST=%TEMP%\python_installer_%RANDOM%.exe"
    curl.exe -L --fail --progress-bar "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" -o "%TEMP_INST%"
    if exist "%TEMP_INST%" (
        echo Installing Python silently...
        "%TEMP_INST%" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 SimpleInstall=1
        del /f /q "%TEMP_INST%" >nul 2>&1
        set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
        if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    )
)

if "%PY_CMD%"=="" (
    echo [ERROR] Python not found and auto-install could not complete.
    echo Please install Python manually from python.org.
    pause
    exit /b 1
)

echo [OK] Using Python launcher: %PY_CMD%
echo Checking required libraries (pyhanko, python-pkcs11, requests, tzlocal)...
%PY_CMD% -c "import pyhanko, pkcs11, requests, tzlocal" >nul 2>&1
if errorlevel 1 (
    echo Installing missing Python dependencies...
    %PY_CMD% -m pip install --quiet pyhanko python-pkcs11 requests tzlocal cryptography
)

if exist "mercado-dsc-client\sspacia-dsc-gateway.py" (
    %PY_CMD% mercado-dsc-client\sspacia-dsc-gateway.py --server %SERVER_URL% --center Mercado
) else if exist "scripts\sspacia-dsc-gateway.py" (
    %PY_CMD% scripts\sspacia-dsc-gateway.py --server %SERVER_URL% --center Mercado
) else (
    echo [ERROR] Gateway script not found!
)

pause
