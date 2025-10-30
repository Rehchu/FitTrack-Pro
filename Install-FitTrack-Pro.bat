@echo off
:: FitTrack Pro - One-Click Installer
:: Double-click this file to install FitTrack Pro on any Windows machine
:: Will automatically request admin privileges if needed

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :RunInstaller
) else (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:RunInstaller
cls
echo.
echo ========================================
echo   FitTrack Pro - One-Click Installer
echo ========================================
echo.
echo This will install FitTrack Pro and all prerequisites on this machine.
echo.
echo What will be installed:
echo   - Git
echo   - Node.js
echo   - Python
echo   - Visual Studio Code
echo   - Docker Desktop
echo   - Cloudflare Wrangler
echo   - 40+ VS Code Extensions
echo   - FitTrack Pro Project
echo.
pause
echo.
echo Starting installation...
echo.

:: Download and run the bootstrap script
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Rehchu/FitTrack-Pro/fix/cloudflare-pages-config/scripts/bootstrap-fittrack.ps1' -OutFile '%TEMP%\bootstrap-fittrack.ps1'; & '%TEMP%\bootstrap-fittrack.ps1'"

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
pause
