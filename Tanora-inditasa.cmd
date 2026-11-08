@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

title Kémiai játék – tanóra indítása

where powershell >nul 2>&1
if errorlevel 1 (
  echo [HIBA] A PowerShell nem elérhető ezen a gépen.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Tanora-inditasa.ps1"
set "KOD=%ERRORLEVEL%"
endlocal & exit /b %KOD%
