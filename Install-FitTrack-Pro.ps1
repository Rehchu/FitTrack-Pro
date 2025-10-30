# FitTrack Pro - One-Click Installer
# Double-click to install on any Windows machine
# Auto-requests admin privileges

# Self-elevate if not running as admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Clear-Host
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                ║" -ForegroundColor Cyan
Write-Host "║     FitTrack Pro - One-Click Installer        ║" -ForegroundColor Cyan
Write-Host "║                                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will install FitTrack Pro and all prerequisites on this machine." -ForegroundColor White
Write-Host ""
Write-Host "What will be installed:" -ForegroundColor Yellow
Write-Host "  ✓ Git (version control)" -ForegroundColor Green
Write-Host "  ✓ Node.js LTS (JavaScript runtime)" -ForegroundColor Green
Write-Host "  ✓ Python 3.x (backend runtime)" -ForegroundColor Green
Write-Host "  ✓ Visual Studio Code (code editor)" -ForegroundColor Green
Write-Host "  ✓ Docker Desktop (containers)" -ForegroundColor Green
Write-Host "  ✓ Cloudflare Wrangler (deployment tool)" -ForegroundColor Green
Write-Host "  ✓ 40+ VS Code Extensions" -ForegroundColor Green
Write-Host "  ✓ FitTrack Pro Project (cloned from GitHub)" -ForegroundColor Green
Write-Host ""
Write-Host "Install location: C:\Projects\FitTrack-Pro" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to start installation..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           Starting Installation...             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Download and run bootstrap script
try {
    Write-Host "📥 Downloading bootstrap script..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Rehchu/FitTrack-Pro/fix/cloudflare-pages-config/scripts/bootstrap-fittrack.ps1" -OutFile "$env:TEMP\bootstrap-fittrack.ps1"
    
    Write-Host "✅ Download complete" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Running installation..." -ForegroundColor Cyan
    Write-Host ""
    
    & "$env:TEMP\bootstrap-fittrack.ps1"
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                ║" -ForegroundColor Green
    Write-Host "║          ✅ Installation Complete! ✅          ║" -ForegroundColor Green
    Write-Host "║                                                ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 FitTrack Pro is now installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start FitTrack Pro:" -ForegroundColor Yellow
    Write-Host "  1. Open VS Code" -ForegroundColor White
    Write-Host "  2. Open the project: C:\Projects\FitTrack-Pro" -ForegroundColor White
    Write-Host "  3. In GitHub Copilot Chat, say: 'execute Project Fittrack'" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "❌ Installation failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
