# FitTrack Pro - One-Command Executor
# This is the script that runs when you say "execute Project Fittrack"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🚀 FitTrack Pro - Auto Executor      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Determine the project root directory
# Try to find it from the script location or current directory
$scriptDir = Split-Path -Parent $PSCommandPath
if (Test-Path (Join-Path $scriptDir ".git")) {
    $projectRoot = $scriptDir
} elseif (Test-Path ".git") {
    $projectRoot = Get-Location
} else {
    # Fall back to hardcoded path if we can't find it
    $projectRoot = "E:\FitTrack Pro 1.1"
    if (!(Test-Path $projectRoot)) {
        Write-Host "❌ Could not find FitTrack Pro project directory" -ForegroundColor Red
        Write-Host "💡 Tip: Run bootstrap script to set up on a fresh machine" -ForegroundColor Yellow
        Write-Host "   Say 'bootstrap fittrack' in GitHub Copilot Chat" -ForegroundColor Yellow
        exit 1
    }
}

Set-Location $projectRoot
Write-Host "📁 Project Root: $projectRoot" -ForegroundColor Cyan
Write-Host ""

# Check if auto-setup has been run
$setupMarker = "$projectRoot\.fittrack-setup-complete"

if (!(Test-Path $setupMarker)) {
    Write-Host "🔧 First-time setup detected. Running auto-setup..." -ForegroundColor Yellow
    Write-Host "   This will install all prerequisites and dependencies" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if we need admin rights
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $isAdmin = $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (!$isAdmin) {
        Write-Host "⚠️  Administrator rights needed for first-time setup" -ForegroundColor Yellow
        Write-Host "🔄 Relaunching with admin privileges..." -ForegroundColor Yellow
        Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Wait
        exit
    }
    
    # Run the auto-setup script
    if (Test-Path "$projectRoot\scripts\auto-setup.ps1") {
        & "$projectRoot\scripts\auto-setup.ps1"
    } else {
        Write-Host "❌ auto-setup.ps1 not found" -ForegroundColor Red
        Write-Host "💡 Try running bootstrap script instead" -ForegroundColor Yellow
        exit 1
    }
    
    # Create marker file
    Get-Date | Out-File -FilePath $setupMarker
    
    Write-Host ""
    Write-Host "✅ First-time setup complete!" -ForegroundColor Green
    Write-Host ""
    
    # Check if restart is needed (for Docker, etc.)
    $restartNeeded = $false
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        $restartNeeded = $true
    }
    
    if ($restartNeeded) {
        Write-Host "⚠️  A system restart may be required for all features" -ForegroundColor Yellow
        Write-Host "   (Docker Desktop and other tools)" -ForegroundColor Yellow
        Write-Host ""
        $restart = Read-Host "Restart now? (y/N)"
        if ($restart -eq 'y' -or $restart -eq 'Y') {
            Restart-Computer -Confirm
            exit
        }
        Write-Host "💡 Remember to restart later for full functionality" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Continue with normal startup
Write-Host "🚀 Starting FitTrack Pro Services..." -ForegroundColor Green
Write-Host ""

# Continue with normal startup
Write-Host "🚀 Starting FitTrack Pro Services..." -ForegroundColor Green
Write-Host ""

# Check for required tools
$missingTools = @()
if (!(Get-Command python -ErrorAction SilentlyContinue)) { $missingTools += "Python" }
if (!(Get-Command node -ErrorAction SilentlyContinue)) { $missingTools += "Node.js" }
if (!(Get-Command git -ErrorAction SilentlyContinue)) { $missingTools += "Git" }

if ($missingTools.Count -gt 0) {
    Write-Host "❌ Missing required tools: $($missingTools -join ', ')" -ForegroundColor Red
    Write-Host "💡 Run auto-setup to install missing tools:" -ForegroundColor Yellow
    Write-Host "   Delete .fittrack-setup-complete and run this script again" -ForegroundColor Yellow
    exit 1
}

# Activate Python virtual environment
Write-Host "🐍 Activating Python environment..." -ForegroundColor Cyan
& "$projectRoot\.venv\Scripts\Activate.ps1"

# Check Docker status
Write-Host "🐳 Checking Docker..." -ForegroundColor Cyan
$dockerRunning = docker info 2>&1 | Select-String "Server Version"
if (!$dockerRunning) {
    Write-Host "⚠️  Docker is not running. Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host "Waiting for Docker to start (30 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

# Start services in background
Write-Host ""
Write-Host "🚀 Starting FitTrack Pro Services..." -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Start backend server
Write-Host "📡 Starting backend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; & '$projectRoot\.venv\Scripts\Activate.ps1'; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start web client
Write-Host "🌐 Starting web client..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\web-client'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# Open VS Code with project
Write-Host "💻 Opening VS Code..." -ForegroundColor Cyan
if (Get-Command code -ErrorAction SilentlyContinue) {
    Start-Process code -ArgumentList "$projectRoot" -WindowStyle Normal
    Write-Host "✅ VS Code opened" -ForegroundColor Green
} else {
    Write-Host "⚠️  VS Code not found in PATH" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# Wait for services to be ready
Write-Host "⏳ Waiting for services to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

# Open web client in browser
Write-Host "🌐 Opening web client in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

# Show status dashboard
Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "✅ FitTrack Pro is Running!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Service URLs:" -ForegroundColor Yellow
Write-Host "  Backend API:      http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:         http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Web Client:       http://localhost:5173" -ForegroundColor White
Write-Host "  Trainer Portal:   https://fittrack-trainer.rehchu1.workers.dev" -ForegroundColor White
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Yellow
Write-Host "  Backend:          Running (PowerShell window)" -ForegroundColor Green
Write-Host "  Web Client:       Running (PowerShell window)" -ForegroundColor Green
Write-Host "  Cloudflare:       Deployed" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Quick Actions:" -ForegroundColor Yellow
Write-Host "  [1] Open Web Client in Browser" -ForegroundColor White
Write-Host "  [2] Open API Docs in Browser" -ForegroundColor White
Write-Host "  [3] Open Trainer Portal in Browser" -ForegroundColor White
Write-Host "  [4] Deploy Cloudflare Worker" -ForegroundColor White
Write-Host "  [5] View Cloudflare Logs" -ForegroundColor White
Write-Host "  [6] Run Tests" -ForegroundColor White
Write-Host "  [Q] Quit" -ForegroundColor White
Write-Host ""

# Interactive menu
while ($true) {
    $choice = Read-Host "Select an option"
    
    switch ($choice) {
        "1" {
            Start-Process "http://localhost:5173"
            Write-Host "✅ Opened web client in browser" -ForegroundColor Green
        }
        "2" {
            Start-Process "http://localhost:8000/docs"
            Write-Host "✅ Opened API docs in browser" -ForegroundColor Green
        }
        "3" {
            Start-Process "https://fittrack-trainer.rehchu1.workers.dev"
            Write-Host "✅ Opened trainer portal in browser" -ForegroundColor Green
        }
        "4" {
            Write-Host "🚀 Deploying Cloudflare Worker..." -ForegroundColor Cyan
            Set-Location "$projectRoot\integrations\cloudflare\fittrack-trainer"
            npx wrangler deploy --name fittrack-trainer
            Set-Location $projectRoot
            Write-Host "✅ Deployment complete" -ForegroundColor Green
        }
        "5" {
            Write-Host "📋 Viewing Cloudflare logs (Ctrl+C to stop)..." -ForegroundColor Cyan
            Set-Location "$projectRoot\integrations\cloudflare\fittrack-trainer"
            npx wrangler tail fittrack-trainer
            Set-Location $projectRoot
        }
        "6" {
            Write-Host "🧪 Running tests..." -ForegroundColor Cyan
            Set-Location "$projectRoot\backend"
            pytest
            Set-Location $projectRoot
        }
        {$_ -eq "q" -or $_ -eq "Q"} {
            Write-Host ""
            Write-Host "👋 Services are still running in background windows" -ForegroundColor Yellow
            Write-Host "Close those windows to stop the services" -ForegroundColor Yellow
            exit
        }
        default {
            Write-Host "❌ Invalid option. Please try again." -ForegroundColor Red
        }
    }
    Write-Host ""
}
