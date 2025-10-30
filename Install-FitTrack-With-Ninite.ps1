# FitTrack Pro - Master Installer with Ninite
# This runs Ninite first, then installs FitTrack Pro
# Place this file alongside your Ninite installer on your USB drive

# Self-elevate if not running as admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Clear-Host
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                ║" -ForegroundColor Cyan
Write-Host "║    FitTrack Pro - Master Installer Suite      ║" -ForegroundColor Cyan
Write-Host "║                                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will install everything you need in 2 steps:" -ForegroundColor White
Write-Host ""
Write-Host "Step 1: Ninite (basic software)" -ForegroundColor Yellow
Write-Host "  • Installs your selected apps from Ninite" -ForegroundColor Green
Write-Host ""
Write-Host "Step 2: FitTrack Pro Development Environment" -ForegroundColor Yellow
Write-Host "  • Git, Node.js, Python, VS Code, Docker" -ForegroundColor Green
Write-Host "  • Cloudflare Wrangler CLI" -ForegroundColor Green
Write-Host "  • 40+ VS Code Extensions" -ForegroundColor Green
Write-Host "  • FitTrack Pro Project (cloned from GitHub)" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to begin installation..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# USB drive configuration
$usbDrive = "F:\"
$niniteName = "Ninite 7Zip ASPNET Core Runtime 8 Installer.exe"
$ninitePath = Join-Path $usbDrive $niniteName

# Step 1: Run Ninite
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Step 1: Running Ninite Installer      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Look for Ninite executable on USB drive
if (Test-Path $ninitePath) {
    Write-Host "✅ Found Ninite installer: $niniteName" -ForegroundColor Green
    Write-Host "   Location: $ninitePath" -ForegroundColor Gray
    Write-Host "📦 Running Ninite..." -ForegroundColor Cyan
    Write-Host ""
    
    # Run Ninite and wait for it to complete
    Start-Process -FilePath $ninitePath -Wait
    
    Write-Host ""
    Write-Host "✅ Ninite installation complete!" -ForegroundColor Green
} else {
    Write-Host "❌ Ninite installer not found!" -ForegroundColor Red
    Write-Host "   Expected location: $ninitePath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "  • USB drive is plugged in and assigned to F:\" -ForegroundColor Yellow
    Write-Host "  • Ninite installer is named: $niniteName" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Skipping to FitTrack Pro installation..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to continue to FitTrack Pro installation..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Step 2: Install FitTrack Pro
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Step 2: Installing FitTrack Pro Suite      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "📥 Downloading FitTrack Pro bootstrap script..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Rehchu/FitTrack-Pro/fix/cloudflare-pages-config/scripts/bootstrap-fittrack.ps1" -OutFile "$env:TEMP\bootstrap-fittrack.ps1"
    
    Write-Host "✅ Download complete" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Running FitTrack Pro installation..." -ForegroundColor Cyan
    Write-Host ""
    
    & "$env:TEMP\bootstrap-fittrack.ps1"
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                ║" -ForegroundColor Green
    Write-Host "║      ✅ All Installations Complete! ✅         ║" -ForegroundColor Green
    Write-Host "║                                                ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Your development environment is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Restart your computer (if prompted by Ninite or Docker)" -ForegroundColor White
    Write-Host "  2. Open VS Code" -ForegroundColor White
    Write-Host "  3. Open the project: C:\Projects\FitTrack-Pro" -ForegroundColor White
    Write-Host "  4. In GitHub Copilot Chat, say: 'execute Project Fittrack'" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "❌ FitTrack Pro installation failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
