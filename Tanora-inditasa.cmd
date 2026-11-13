@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

title Kemiai jatek - tanora inditasa / leallitasa

where powershell >nul 2>&1
if errorlevel 1 (
  echo [HIBA] A PowerShell nem erheto el ezen a gepen.
  pause
  exit /b 1
)

echo.
echo  Az ablak X-szel bezarasa leallitja a tanorat
echo  ^(Node-szerver + Cloudflare Tunnel^).
echo  Elso inditaskor az adatbazis es a tanari fiok
echo  automatikusan letrejon a csomag adataibol.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Tanora-inditasa.ps1"
set "KOD=%ERRORLEVEL%"
endlocal & exit /b %KOD%
