@echo off
:: FitTrack Pro - Master Installer with Ninite
:: This runs Ninite first, then installs FitTrack Pro
:: Place this file alongside your Ninite installer on your USB drive

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
echo   FitTrack Pro - Master Installer
echo ========================================
echo.
echo This will:
echo   1. Run Ninite to install basic software
echo   2. Install FitTrack Pro prerequisites
echo   3. Clone and set up FitTrack Pro project
echo.
pause
echo.

:: USB drive configuration
set USB_DRIVE=F:\
set NINITE_NAME=Ninite 7Zip ASPNET Core Runtime 8 Installer.exe
set NINITE_PATH=%USB_DRIVE%%NINITE_NAME%

:: Step 1: Look for Ninite installer
echo ========================================
echo Step 1: Running Ninite Installer
echo ========================================
echo.

:: Look for Ninite executable on USB drive
if exist "%NINITE_PATH%" (
    echo Found Ninite installer: %NINITE_NAME%
    echo Location: %NINITE_PATH%
    echo Running Ninite...
    echo.
    start /wait "%NINITE_PATH%"
    echo.
    echo Ninite installation complete!
    goto :RunFitTrack
)

:: If no Ninite found, show error
echo ERROR: Ninite installer not found!
echo Expected location: %NINITE_PATH%
echo.
echo Please ensure:
echo   - USB drive is plugged in and assigned to F:\
echo   - Ninite installer is named: %NINITE_NAME%
echo.
echo Skipping to FitTrack Pro installation...
echo.

:RunFitTrack
echo.
echo ========================================
echo Step 2: Installing FitTrack Pro
echo ========================================
echo.
pause

:: Download and run the FitTrack bootstrap script
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Rehchu/FitTrack-Pro/fix/cloudflare-pages-config/scripts/bootstrap-fittrack.ps1' -OutFile '%TEMP%\bootstrap-fittrack.ps1'; & '%TEMP%\bootstrap-fittrack.ps1'"

echo.
echo ========================================
echo   All Installations Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Restart your computer if prompted
echo   2. Open VS Code
echo   3. Open project: C:\Projects\FitTrack-Pro
echo   4. Say in Copilot Chat: "execute Project Fittrack"
echo.
pause
