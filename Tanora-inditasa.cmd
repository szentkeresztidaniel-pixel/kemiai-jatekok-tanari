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

set "KEMIA_TANARI_BELEPES_FAJL=%~dp0tanari-belepes.helyi"
set "TANARI_BELEPES_FAJL=%KEMIA_TANARI_BELEPES_FAJL%"
if not exist "%TANARI_BELEPES_FAJL%" (
  echo [HIBA] Hianyzik a tanari belepesi fajl:
  echo   %TANARI_BELEPES_FAJL%
  pause
  exit /b 1
)

set "KEMIA_TANAR_EMAIL="
set "KEMIA_TANAR_JELSZO="
for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%TANARI_BELEPES_FAJL%") do (
  if /I "%%A"=="EMAIL" set "KEMIA_TANAR_EMAIL=%%B"
  if /I "%%A"=="JELSZO" set "KEMIA_TANAR_JELSZO=%%B"
)

if not defined KEMIA_TANAR_EMAIL (
  echo [HIBA] A tanari-belepes.helyi nem tartalmaz EMAIL= sort.
  pause
  exit /b 1
)
if not defined KEMIA_TANAR_JELSZO (
  echo [HIBA] A tanari-belepes.helyi nem tartalmaz JELSZO= sort.
  pause
  exit /b 1
)

echo.
echo  Az ablak X-szel bezarasa leallitja a tanorat
echo  ^(Node-szerver + Cloudflare Tunnel^).
echo.
echo  Tanari belepes
echo  --------------
echo  E-mail: %KEMIA_TANAR_EMAIL%
echo  Jelszo: %KEMIA_TANAR_JELSZO%
echo  Ird be ezeket a bongeszo tanari belepesi mezokbe.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Tanora-inditasa.ps1"
set "KOD=%ERRORLEVEL%"
endlocal & exit /b %KOD%
