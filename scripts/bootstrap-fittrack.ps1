# FitTrack Pro - Bootstrap Script
# This script can be run from anywhere - it will set up everything from scratch

<#
.SYNOPSIS
    Bootstrap FitTrack Pro development environment from scratch
    
.DESCRIPTION
    This script installs all prerequisites and clones the FitTrack Pro repository.
    Can be run on a fresh machine with no tools installed.
    
.PARAMETER InstallPath
    Directory where FitTrack Pro will be cloned (default: C:\Projects)
    
.PARAMETER SkipDocker
    Skip Docker Desktop installation
    
.EXAMPLE
    .\bootstrap-fittrack.ps1
    
.EXAMPLE
    .\bootstrap-fittrack.ps1 -InstallPath "D:\Development"
    
.EXAMPLE
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Rehchu/FitTrack-Pro/fix/cloudflare-pages-config/scripts/bootstrap-fittrack.ps1" -OutFile "$env:TEMP\bootstrap-fittrack.ps1"; & "$env:TEMP\bootstrap-fittrack.ps1"
#>

param(
    [string]$InstallPath = "C:\Projects",
    [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   FitTrack Pro - Bootstrap Installer     ║" -ForegroundColor Cyan
Write-Host "║   Zero to Hero in One Command            ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
function Test-Admin {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Ensure admin rights
if (!(Test-Admin)) {
    Write-Host "⚠️  Administrator rights required for installation" -ForegroundColor Yellow
    Write-Host "🔄 Relaunching script as administrator..." -ForegroundColor Yellow
    
    $scriptArgs = "-InstallPath `"$InstallPath`""
    if ($SkipDocker) {
        $scriptArgs += " -SkipDocker"
    }
    
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" $scriptArgs"
    exit
}

Write-Host "✅ Running with administrator privileges" -ForegroundColor Green
Write-Host ""

# Repository configuration
$repoUrl = "https://github.com/Rehchu/FitTrack-Pro.git"
$repoBranch = "fix/cloudflare-pages-config"
$repoName = "FitTrack-Pro"
$projectPath = Join-Path $InstallPath $repoName

Write-Host "📋 Configuration:" -ForegroundColor Cyan
Write-Host "  Install Path:  $InstallPath" -ForegroundColor White
Write-Host "  Project Path:  $projectPath" -ForegroundColor White
Write-Host "  Repository:    $repoUrl" -ForegroundColor White
Write-Host "  Branch:        $repoBranch" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Continue with installation? (Y/n)"
if ($continue -eq 'n' -or $continue -eq 'N') {
    Write-Host "Installation cancelled" -ForegroundColor Yellow
    exit
}

# Step 1: Install Chocolatey
Write-Host ""
Write-Host "📦 Installing Chocolatey package manager..." -ForegroundColor Cyan
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "✅ Chocolatey installed" -ForegroundColor Green
} else {
    Write-Host "✅ Chocolatey already installed" -ForegroundColor Green
}

# Step 2: Install Git
Write-Host ""
Write-Host "📦 Installing Git..." -ForegroundColor Cyan
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "✅ Git installed" -ForegroundColor Green
} else {
    Write-Host "✅ Git already installed" -ForegroundColor Green
}

# Step 3: Install Node.js
Write-Host ""
Write-Host "📦 Installing Node.js..." -ForegroundColor Cyan
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "✅ Node.js installed" -ForegroundColor Green
} else {
    Write-Host "✅ Node.js already installed" -ForegroundColor Green
}

# Step 4: Install Python
Write-Host ""
Write-Host "📦 Installing Python..." -ForegroundColor Cyan
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    choco install python -y
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "✅ Python installed" -ForegroundColor Green
} else {
    Write-Host "✅ Python already installed" -ForegroundColor Green
}

# Step 5: Install VS Code
Write-Host ""
Write-Host "📦 Installing Visual Studio Code..." -ForegroundColor Cyan
if (!(Get-Command code -ErrorAction SilentlyContinue)) {
    choco install vscode -y
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "✅ VS Code installed" -ForegroundColor Green
} else {
    Write-Host "✅ VS Code already installed" -ForegroundColor Green
}

# Step 6: Install Docker Desktop
if (!$SkipDocker) {
    Write-Host ""
    Write-Host "📦 Installing Docker Desktop..." -ForegroundColor Cyan
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        choco install docker-desktop -y
        Write-Host "✅ Docker Desktop installed" -ForegroundColor Green
        Write-Host "⚠️  Note: Docker requires WSL2. A restart may be needed." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Docker Desktop already installed" -ForegroundColor Green
    }
}

# Step 7: Clone repository
Write-Host ""
Write-Host "📁 Cloning FitTrack Pro repository..." -ForegroundColor Cyan

if (!(Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Host "✅ Created directory: $InstallPath" -ForegroundColor Green
}

Set-Location $InstallPath

if (Test-Path $projectPath) {
    Write-Host "⚠️  Project already exists at $projectPath" -ForegroundColor Yellow
    Set-Location $projectPath
    
    Write-Host "📥 Pulling latest changes..." -ForegroundColor Yellow
    git fetch origin
    git checkout $repoBranch
    git pull origin $repoBranch
    
    Write-Host "✅ Repository updated" -ForegroundColor Green
} else {
    git clone $repoUrl
    Set-Location $repoName
    git checkout $repoBranch
    
    Write-Host "✅ Repository cloned" -ForegroundColor Green
}

# Step 8: Run auto-setup script
Write-Host ""
Write-Host "🚀 Running auto-setup script..." -ForegroundColor Cyan
Write-Host ""

$setupArgs = ""
if ($SkipDocker) {
    $setupArgs = "-SkipDocker"
}

& ".\scripts\auto-setup.ps1" $setupArgs

# Step 9: Final message
Write-Host ""
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        🎉 Installation Complete! 🎉      ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Project Location: $projectPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 To start FitTrack Pro, run:" -ForegroundColor Yellow
Write-Host "   cd `"$projectPath`"" -ForegroundColor White
Write-Host "   .\execute-fittrack.ps1" -ForegroundColor White
Write-Host ""
Write-Host "💡 Or just say in GitHub Copilot Chat:" -ForegroundColor Yellow
Write-Host "   'execute Project Fittrack'" -ForegroundColor White
Write-Host ""

# Ask if user wants to start now
$startNow = Read-Host "Start FitTrack Pro now? (Y/n)"
if ($startNow -ne 'n' -and $startNow -ne 'N') {
    Write-Host ""
    Write-Host "🚀 Starting FitTrack Pro..." -ForegroundColor Green
    Write-Host ""
    & ".\execute-fittrack.ps1"
}
