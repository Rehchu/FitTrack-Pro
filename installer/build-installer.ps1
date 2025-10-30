# FitTrack Pro - Complete Installer Build Script
# Creates a Windows installer with embedded Python and all dependencies

param(
    [string]$Version = "1.2.0"
)

$ErrorActionPreference = "Stop"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "FitTrack Pro Installer Builder" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Configuration
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$InstallerDir = $PSScriptRoot
$BuildDir = Join-Path $InstallerDir "build"
$OutputDir = Join-Path $InstallerDir "output"

# Create directories
Write-Host "`n[1/9] Creating build directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $BuildDir "python") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $BuildDir "backend") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $BuildDir "desktop-app") | Out-Null

# Download embedded Python
Write-Host "`n[2/9] Downloading Python 3.11 embedded..." -ForegroundColor Yellow
$PythonUrl = "https://www.python.org/ftp/python/3.11.6/python-3.11.6-embed-amd64.zip"
$PythonZip = Join-Path $BuildDir "python-embed.zip"
$PythonDir = Join-Path $BuildDir "python"

if (-not (Test-Path $PythonZip)) {
    Invoke-WebRequest -Uri $PythonUrl -OutFile $PythonZip
    Write-Host "   Downloaded Python embed package" -ForegroundColor Green
}

# Extract Python
Write-Host "`n[3/9] Extracting Python..." -ForegroundColor Yellow
Expand-Archive -Path $PythonZip -DestinationPath $PythonDir -Force
Write-Host "   Extracted to: $PythonDir" -ForegroundColor Green

# Modify python311._pth to enable site-packages
Write-Host "`n[4/9] Configuring Python paths..." -ForegroundColor Yellow
$PthFile = Join-Path $PythonDir "python311._pth"
$PthContent = @"
python311.zip
.
Lib
Lib\site-packages

# Uncomment to run site.main() automatically
import site
"@
Set-Content -Path $PthFile -Value $PthContent
Write-Host "   Configured Python import paths" -ForegroundColor Green

# Download get-pip.py
Write-Host "`n[5/9] Installing pip..." -ForegroundColor Yellow
$GetPipUrl = "https://bootstrap.pypa.io/get-pip.py"
$GetPipPath = Join-Path $PythonDir "get-pip.py"
Invoke-WebRequest -Uri $GetPipUrl -OutFile $GetPipPath

# Install pip
$PythonExe = Join-Path $PythonDir "python.exe"
& $PythonExe $GetPipPath --no-warn-script-location
Write-Host "   Pip installed successfully" -ForegroundColor Green

# Install backend dependencies
Write-Host "`n[6/9] Installing Python dependencies..." -ForegroundColor Yellow
$RequirementsFile = Join-Path $ProjectRoot "backend\requirements.txt"
& $PythonExe -m pip install -r $RequirementsFile --target (Join-Path $PythonDir "Lib\site-packages") --no-warn-script-location
Write-Host "   All Python packages installed" -ForegroundColor Green

# Copy backend files
Write-Host "`n[7/9] Copying backend files..." -ForegroundColor Yellow
$BackendSource = Join-Path $ProjectRoot "backend"
$BackendDest = Join-Path $BuildDir "backend"
Copy-Item -Path (Join-Path $BackendSource "app") -Destination (Join-Path $BackendDest "app") -Recurse -Force
Copy-Item -Path (Join-Path $BackendSource "requirements.txt") -Destination $BackendDest -Force
Copy-Item -Path (Join-Path $BackendSource ".env.example") -Destination (Join-Path $BackendDest ".env") -Force
Write-Host "   Backend files copied" -ForegroundColor Green

# Build Electron app
Write-Host "`n[8/9] Building Electron desktop app..." -ForegroundColor Yellow
Push-Location (Join-Path $ProjectRoot "desktop-app")
npm install --legacy-peer-deps
npm run build
npm run pack
Pop-Location

# Copy Electron app
$ElectronSource = Join-Path $ProjectRoot "desktop-app\dist\win-unpacked"
$ElectronDest = Join-Path $BuildDir "desktop-app"
if (Test-Path $ElectronSource) {
    Copy-Item -Path "$ElectronSource\*" -Destination $ElectronDest -Recurse -Force
    Write-Host "   Desktop app built and copied" -ForegroundColor Green
} else {
    Write-Host "   Warning: Electron build not found, using development files" -ForegroundColor Yellow
}

# Copy cloudflared
$CloudflaredSource = Join-Path $ProjectRoot "cloudflared.exe"
if (Test-Path $CloudflaredSource) {
    Copy-Item -Path $CloudflaredSource -Destination (Join-Path $BuildDir "cloudflared.exe") -Force
    Write-Host "   Cloudflared copied" -ForegroundColor Green
}

# Create launcher script
Write-Host "`n[9/9] Creating launcher scripts..." -ForegroundColor Yellow

$LauncherScript = @'
@echo off
setlocal

:: Set paths
set INSTALL_DIR=%~dp0
set PYTHON_DIR=%INSTALL_DIR%python
set BACKEND_DIR=%INSTALL_DIR%backend
set DESKTOP_APP=%INSTALL_DIR%desktop-app\FitTrack Pro.exe

:: Check if first run
if not exist "%INSTALL_DIR%data" (
    echo First time setup...
    mkdir "%INSTALL_DIR%data"
    mkdir "%INSTALL_DIR%uploads"
    mkdir "%INSTALL_DIR%uploads\measurement_photos"
    mkdir "%INSTALL_DIR%uploads\thumbnails"
    mkdir "%INSTALL_DIR%uploads\workout_videos"
)

:: Start backend server (hidden)
echo Starting FitTrack Pro backend...
start /B "" "%PYTHON_DIR%\python.exe" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --app-dir "%INSTALL_DIR%"

:: Wait for backend to start
timeout /t 3 /nobreak > nul

:: Launch desktop app
echo Launching FitTrack Pro...
start "" "%DESKTOP_APP%"

exit
'@

Set-Content -Path (Join-Path $BuildDir "FitTrack Pro.bat") -Value $LauncherScript
Write-Host "   Launcher script created" -ForegroundColor Green

# Create Inno Setup script
$InnoScript = @"
; FitTrack Pro Installer Script
; Creates a complete installation package with Python, backend, and desktop app

#define MyAppName "FitTrack Pro"
#define MyAppVersion "$Version"
#define MyAppPublisher "FitTrack Pro Team"
#define MyAppURL "https://fittrackpro.com"
#define MyAppExeName "FitTrack Pro.bat"

[Setup]
AppId={{8F9A7B6C-5D4E-3A2B-1C9F-8E7D6A5B4C3D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=..\LICENSE.txt
OutputDir=$OutputDir
OutputBaseFilename=FitTrackPro-Setup-{#MyAppVersion}
SetupIconFile=..\desktop-app\build\icon.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
UninstallDisplayIcon={app}\desktop-app\FitTrack Pro.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Python embedded runtime
Source: "$BuildDir\python\*"; DestDir: "{app}\python"; Flags: ignoreversion recursesubdirs createallsubdirs

; Backend application
Source: "$BuildDir\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs

; Desktop application
Source: "$BuildDir\desktop-app\*"; DestDir: "{app}\desktop-app"; Flags: ignoreversion recursesubdirs createallsubdirs

; Cloudflared (optional)
Source: "$BuildDir\cloudflared.exe"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; Launcher script
Source: "$BuildDir\FitTrack Pro.bat"; DestDir: "{app}"; Flags: ignoreversion

; Documentation
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
procedure InitializeWizard;
begin
  WizardForm.WelcomeLabel2.Caption := 
    'This will install FitTrack Pro on your computer.' + #13#10 + #13#10 +
    'FitTrack Pro is a complete personal training platform with:' + #13#10 +
    '  • Client management and progress tracking' + #13#10 +
    '  • Workout and meal planning' + #13#10 +
    '  • PDF reports and email integration' + #13#10 +
    '  • Video calls and messaging' + #13#10 +
    '  • Achievement system and gamification' + #13#10 + #13#10 +
    'No additional software required - everything is included!';
end;
"@

Set-Content -Path (Join-Path $InstallerDir "installer.iss") -Value $InnoScript
Write-Host "   Inno Setup script created" -ForegroundColor Green

Write-Host "`n==================================" -ForegroundColor Green
Write-Host "Build preparation complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Install Inno Setup from: https://jrsoftware.org/isdl.php" -ForegroundColor White
Write-Host "2. Open installer\installer.iss in Inno Setup" -ForegroundColor White
Write-Host "3. Click 'Compile' to create the installer" -ForegroundColor White
Write-Host "4. Find installer in: $OutputDir" -ForegroundColor White
Write-Host "`nOr run: iscc installer\installer.iss" -ForegroundColor Yellow
