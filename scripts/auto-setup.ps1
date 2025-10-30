# FitTrack Pro - Automated Setup Script
# Usage: Just run this script and it handles everything

param(
    [switch]$SkipDocker,
    [switch]$SkipVSCodeExtensions
)

$ErrorActionPreference = "Stop"
Write-Host "🚀 FitTrack Pro - Automated Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Helper function to check if running as admin
function Test-Admin {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Helper function to install Chocolatey
function Install-Chocolatey {
    if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "📦 Installing Chocolatey package manager..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        refreshenv
        Write-Host "✅ Chocolatey installed" -ForegroundColor Green
    } else {
        Write-Host "✅ Chocolatey already installed" -ForegroundColor Green
    }
}

# Helper function to install software via Chocolatey
function Install-Software {
    param([string]$Name, [string]$ChocoPackage)
    
    if (!(Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Host "📦 Installing $Name..." -ForegroundColor Yellow
        choco install $ChocoPackage -y
        refreshenv
        Write-Host "✅ $Name installed" -ForegroundColor Green
    } else {
        Write-Host "✅ $Name already installed" -ForegroundColor Green
    }
}

# Check if admin rights are needed
$needsAdmin = $false
if (!(Get-Command choco -ErrorAction SilentlyContinue)) { $needsAdmin = $true }
if (!(Get-Command node -ErrorAction SilentlyContinue)) { $needsAdmin = $true }
if (!(Get-Command python -ErrorAction SilentlyContinue)) { $needsAdmin = $true }
if (!(Get-Command git -ErrorAction SilentlyContinue)) { $needsAdmin = $true }
if (!$SkipDocker -and !(Get-Command docker -ErrorAction SilentlyContinue)) { $needsAdmin = $true }

if ($needsAdmin -and !(Test-Admin)) {
    Write-Host "⚠️  Administrator rights required for installation" -ForegroundColor Yellow
    Write-Host "Relaunching script as administrator..." -ForegroundColor Yellow
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

# Step 1: Install Chocolatey
Install-Chocolatey

# Step 2: Install core tools
Write-Host ""
Write-Host "📦 Installing Core Tools..." -ForegroundColor Cyan
Install-Software -Name "git" -ChocoPackage "git"
Install-Software -Name "node" -ChocoPackage "nodejs-lts"
Install-Software -Name "python" -ChocoPackage "python"

# Step 3: Install Docker (optional)
if (!$SkipDocker) {
    Write-Host ""
    Write-Host "🐳 Installing Docker Desktop..." -ForegroundColor Cyan
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        choco install docker-desktop -y
        Write-Host "✅ Docker Desktop installed (restart required)" -ForegroundColor Green
    } else {
        Write-Host "✅ Docker Desktop already installed" -ForegroundColor Green
    }
}

# Step 4: Install Wrangler CLI
Write-Host ""
Write-Host "☁️  Installing Cloudflare Wrangler..." -ForegroundColor Cyan
$wranglerInstalled = npm list -g wrangler 2>&1 | Select-String "wrangler@"
if (!$wranglerInstalled) {
    npm install -g wrangler
    Write-Host "✅ Wrangler installed" -ForegroundColor Green
} else {
    Write-Host "✅ Wrangler already installed" -ForegroundColor Green
}

# Step 5: Install VS Code Extensions (if not skipped)
if (!$SkipVSCodeExtensions -and (Get-Command code -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "🔌 Installing VS Code Extensions..." -ForegroundColor Cyan
    
    $extensions = @(
        "ms-python.python",
        "ms-python.vscode-pylance",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-typescript-next",
        "ms-azuretools.vscode-docker",
        "GitHub.copilot",
        "GitHub.copilot-chat",
        "ms-vscode-remote.remote-containers",
        "cloudflare.cloudflare"
    )
    
    foreach ($ext in $extensions) {
        $installed = code --list-extensions | Select-String -Pattern "^$ext$"
        if (!$installed) {
            Write-Host "  Installing $ext..." -ForegroundColor Yellow
            code --install-extension $ext --force
        } else {
            Write-Host "  ✅ $ext already installed" -ForegroundColor Green
        }
    }
}

# Step 6: Set up Python virtual environment
Write-Host ""
Write-Host "🐍 Setting up Python environment..." -ForegroundColor Cyan
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (!(Test-Path ".venv")) {
    python -m venv .venv
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✅ Virtual environment already exists" -ForegroundColor Green
}

& ".\.venv\Scripts\Activate.ps1"
Write-Host "✅ Virtual environment activated" -ForegroundColor Green

# Install Python dependencies
if (Test-Path "backend\requirements.txt") {
    Write-Host "📦 Installing Python packages..." -ForegroundColor Yellow
    pip install -r backend\requirements.txt --quiet
    Write-Host "✅ Python packages installed" -ForegroundColor Green
}

# Step 7: Install Node.js dependencies
Write-Host ""
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Cyan

# Root package.json
if (Test-Path "package.json") {
    Write-Host "  Installing root dependencies..." -ForegroundColor Yellow
    npm install --silent
    Write-Host "  ✅ Root dependencies installed" -ForegroundColor Green
}

# Backend package.json
if (Test-Path "backend\package.json") {
    Write-Host "  Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install --silent
    Set-Location ..
    Write-Host "  ✅ Backend dependencies installed" -ForegroundColor Green
}

# Desktop app package.json
if (Test-Path "desktop-app\package.json") {
    Write-Host "  Installing desktop-app dependencies..." -ForegroundColor Yellow
    Set-Location desktop-app
    npm install --silent
    Set-Location ..
    Write-Host "  ✅ Desktop-app dependencies installed" -ForegroundColor Green
}

# Web client package.json
if (Test-Path "web-client\package.json") {
    Write-Host "  Installing web-client dependencies..." -ForegroundColor Yellow
    Set-Location web-client
    npm install --silent
    Set-Location ..
    Write-Host "  ✅ Web-client dependencies installed" -ForegroundColor Green
}

# Cloudflare integrations
if (Test-Path "integrations\cloudflare\package.json") {
    Write-Host "  Installing Cloudflare integration dependencies..." -ForegroundColor Yellow
    Set-Location integrations\cloudflare
    npm install --silent
    Set-Location ..\..
    Write-Host "  ✅ Cloudflare dependencies installed" -ForegroundColor Green
}

# Step 8: Create .env file if missing
Write-Host ""
Write-Host "⚙️  Checking environment configuration..." -ForegroundColor Cyan
if (!(Test-Path "backend\.env")) {
    Write-Host "📝 Creating backend\.env from template..." -ForegroundColor Yellow
    @"
# FitTrack Pro Backend Configuration
DATABASE_URL=sqlite:///./fittrack.db
SECRET_KEY=change-this-to-a-random-secret-key-in-production
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token-here
USDA_API_KEY=your-usda-api-key-here
EXERCISEDB_API_KEY=your-exercisedb-api-key-here
RESEND_API_KEY=your-resend-api-key-here
"@ | Out-File -FilePath "backend\.env" -Encoding UTF8
    Write-Host "✅ Created backend\.env (please update with your API keys)" -ForegroundColor Green
} else {
    Write-Host "✅ backend\.env already exists" -ForegroundColor Green
}

# Step 9: Summary
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ FitTrack Pro Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update backend\.env with your API keys" -ForegroundColor White
Write-Host "  2. Run 'wrangler login' to authenticate with Cloudflare" -ForegroundColor White
Write-Host "  3. Deploy trainer portal: 'cd integrations\cloudflare\fittrack-trainer; npx wrangler deploy'" -ForegroundColor White
Write-Host "  4. Start backend: 'cd backend; python -m uvicorn app.main:app --reload'" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Quick Commands:" -ForegroundColor Yellow
Write-Host "  Backend:        cd backend; uvicorn app.main:app --reload" -ForegroundColor White
Write-Host "  Web Client:     cd web-client; npm run dev" -ForegroundColor White
Write-Host "  Desktop App:    cd desktop-app; npm run dev" -ForegroundColor White
Write-Host "  Deploy Trainer: cd integrations\cloudflare\fittrack-trainer; npx wrangler deploy" -ForegroundColor White
Write-Host ""
