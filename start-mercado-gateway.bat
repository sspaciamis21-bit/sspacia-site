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
echo.

if exist "scripts\sspacia-dsc-gateway.py" (
    python scripts\sspacia-dsc-gateway.py --server %SERVER_URL% --center Mercado
    if errorlevel 1 (
        py scripts\sspacia-dsc-gateway.py --server %SERVER_URL% --center Mercado
    )
) else (
    echo [ERROR] scripts\sspacia-dsc-gateway.py not found!
)

pause
