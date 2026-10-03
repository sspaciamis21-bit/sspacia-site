@echo off
title SSPACIA USB DSC Gateway - Live Console Test
color 0A
cd /d "%~dp0"
echo ====================================================================
echo        SSPACIA USB DSC GATEWAY - LIVE CONSOLE TEST (MERCADO)
echo ====================================================================
echo.
python sspacia-dsc-gateway.py --server https://sspacia.com --center Mercado
if errorlevel 1 (
    py sspacia-dsc-gateway.py --server https://sspacia.com --center Mercado
)
pause
