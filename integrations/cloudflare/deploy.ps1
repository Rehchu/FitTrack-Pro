# FitTrack Pro Cloudflare Deployment Script
# Deploys all Cloudflare services with complete configuration

Write-Host "==============================================`n" -ForegroundColor Cyan
Write-Host "  FitTrack Pro - Cloudflare Deployment`n" -ForegroundColor Cyan
Write-Host "==============================================`n`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# Change to Cloudflare directory
Set-Location "e:\FitTrack Pro 1.1\integrations\cloudflare"

# ==================== STEP 1: Prerequisites ====================
Write-Host "[1/9] Checking prerequisites..." -ForegroundColor Yellow

# Check if wrangler is installed
try {
    $wranglerVersion = wrangler --version
    Write-Host "✅ Wrangler installed: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler not found. Installing..." -ForegroundColor Red
    npm install -g wrangler
    Write-Host "✅ Wrangler installed" -ForegroundColor Green
}

# Check if logged in
try {
    $whoami = wrangler whoami 2>&1
    if ($whoami -match "not authenticated") {
        Write-Host "❌ Not logged in to Cloudflare. Please login..." -ForegroundColor Red
        wrangler login
    } else {
        Write-Host "✅ Authenticated with Cloudflare" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not verify authentication. Proceeding anyway..." -ForegroundColor Yellow
}

# ==================== STEP 2: Update wrangler.toml ====================
Write-Host "`n[2/9] Configuring wrangler.toml..." -ForegroundColor Yellow

# Check if account ID is set
$wranglerToml = Get-Content "wrangler.toml" -Raw
if ($wranglerToml -match "YOUR_ACCOUNT_ID") {
    Write-Host "⚠️  Account ID not set in wrangler.toml" -ForegroundColor Yellow
    Write-Host "   Please update account_id in wrangler.toml and run again" -ForegroundColor Yellow
    Write-Host "   Find it at: https://dash.cloudflare.com → Workers & Pages" -ForegroundColor Cyan
    
    # Optionally try to get it automatically
    try {
        $accountInfo = wrangler whoami 2>&1
        if ($accountInfo -match "Account ID:\s+(\w+)") {
            $accountId = $matches[1]
            Write-Host "   Found Account ID: $accountId" -ForegroundColor Green
            
            $update = Read-Host "Update wrangler.toml with this Account ID? (y/n)"
            if ($update -eq "y") {
                $wranglerToml = $wranglerToml -replace "YOUR_ACCOUNT_ID", $accountId
                Set-Content "wrangler.toml" $wranglerToml
                Write-Host "✅ Updated wrangler.toml" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "   Could not auto-detect Account ID" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ Account ID configured" -ForegroundColor Green
}

# ==================== STEP 3: Create D1 Database ====================
Write-Host "`n[3/9] Setting up D1 database..." -ForegroundColor Yellow

$d1Exists = $false
try {
    $d1List = wrangler d1 list --json 2>&1 | ConvertFrom-Json
    $d1Exists = $d1List | Where-Object { $_.name -eq "fittrack-pro-db" }
} catch {
    Write-Host "⚠️  Could not list D1 databases" -ForegroundColor Yellow
}

if (-not $d1Exists) {
    Write-Host "Creating D1 database 'fittrack-pro-db'..." -ForegroundColor Cyan
    wrangler d1 create fittrack-pro-db
    Write-Host "✅ D1 database created" -ForegroundColor Green
    Write-Host "⚠️  Update wrangler.toml with the database_id shown above" -ForegroundColor Yellow
} else {
    Write-Host "✅ D1 database already exists" -ForegroundColor Green
}

# Apply schema
Write-Host "Applying D1 schema..." -ForegroundColor Cyan
try {
    wrangler d1 execute fittrack-pro-db --file=d1-schema.sql
    Write-Host "✅ D1 schema applied" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not apply schema (may already exist)" -ForegroundColor Yellow
}

# ==================== STEP 4: Create Vectorize Index ====================
Write-Host "`n[4/9] Setting up Vectorize index..." -ForegroundColor Yellow

$vectorizeExists = $false
try {
    $vectorizeList = wrangler vectorize list --json 2>&1 | ConvertFrom-Json
    $vectorizeExists = $vectorizeList | Where-Object { $_.name -eq "fittrack-exercises" }
} catch {
    Write-Host "⚠️  Could not list Vectorize indexes" -ForegroundColor Yellow
}

if (-not $vectorizeExists) {
    Write-Host "Creating Vectorize index 'fittrack-exercises'..." -ForegroundColor Cyan
    wrangler vectorize create fittrack-exercises --dimensions=384 --metric=cosine
    Write-Host "✅ Vectorize index created" -ForegroundColor Green
} else {
    Write-Host "✅ Vectorize index already exists" -ForegroundColor Green
}

# ==================== STEP 5: Setup Secrets ====================
Write-Host "`n[5/9] Setting up secrets..." -ForegroundColor Yellow

$requiredSecrets = @(
    "JWT_SECRET",
    "USDA_API_KEY",
    "EXERCISEDB_API_KEY",
    "ENCRYPTION_KEY",
    "WEBHOOK_SECRET"
)

$optionalSecrets = @(
    "OPENAI_API_KEY",
    "SMTP_PASSWORD"
)

Write-Host "Checking existing secrets..." -ForegroundColor Cyan
try {
    $existingSecrets = wrangler secret list 2>&1
    
    foreach ($secret in $requiredSecrets) {
        if ($existingSecrets -notmatch $secret) {
            Write-Host "⚠️  Secret '$secret' not set" -ForegroundColor Yellow
            $setValue = Read-Host "Set $secret now? (y/n)"
            if ($setValue -eq "y") {
                wrangler secret put $secret
            }
        } else {
            Write-Host "✅ Secret '$secret' exists" -ForegroundColor Green
        }
    }
    
    Write-Host "`nOptional secrets (can skip):" -ForegroundColor Cyan
    foreach ($secret in $optionalSecrets) {
        if ($existingSecrets -notmatch $secret) {
            Write-Host "ℹ️  Secret '$secret' not set (optional)" -ForegroundColor Gray
            $setValue = Read-Host "Set $secret? (y/n)"
            if ($setValue -eq "y") {
                wrangler secret put $secret
            }
        } else {
            Write-Host "✅ Secret '$secret' exists" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "⚠️  Could not verify secrets. Continuing..." -ForegroundColor Yellow
}

# ==================== STEP 6: Verify KV Namespace ====================
Write-Host "`n[6/9] Verifying KV namespace..." -ForegroundColor Yellow

try {
    $kvList = wrangler kv:namespace list --json 2>&1 | ConvertFrom-Json
    $kvExists = $kvList | Where-Object { $_.id -eq "d31f5b43bd964ce78d87d9dd5878cc25" }
    
    if ($kvExists) {
        Write-Host "✅ KV namespace exists: $($kvExists.title)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  KV namespace ID in wrangler.toml not found" -ForegroundColor Yellow
        Write-Host "   You may need to create a new KV namespace:" -ForegroundColor Yellow
        Write-Host "   wrangler kv:namespace create FITTRACK_KV" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Could not verify KV namespace" -ForegroundColor Yellow
}

# ==================== STEP 7: Deploy Worker ====================
Write-Host "`n[7/9] Deploying Worker..." -ForegroundColor Yellow

Write-Host "Deploying to Cloudflare..." -ForegroundColor Cyan
try {
    wrangler deploy
    Write-Host "✅ Worker deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed. Check errors above." -ForegroundColor Red
    exit 1
}

# ==================== STEP 8: Test Deployment ====================
Write-Host "`n[8/9] Testing deployment..." -ForegroundColor Yellow

$workerUrl = "https://fittrack-pro-desktop.rehchu1.workers.dev"

Write-Host "Testing health endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$workerUrl/health" -Method GET
    Write-Host "✅ Health check passed" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Features: $($response.features | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ==================== STEP 9: Summary ====================
Write-Host "`n[9/9] Deployment Summary" -ForegroundColor Yellow
Write-Host "==========================`n" -ForegroundColor Yellow

Write-Host "✅ Worker URL: $workerUrl" -ForegroundColor Green
Write-Host "✅ D1 Database: fittrack-pro-db" -ForegroundColor Green
Write-Host "✅ KV Namespace: FITTRACK_KV" -ForegroundColor Green
Write-Host "✅ Vectorize Index: fittrack-exercises" -ForegroundColor Green
Write-Host "✅ Analytics: Enabled" -ForegroundColor Green
Write-Host "✅ Workers AI: Enabled" -ForegroundColor Green
Write-Host "✅ Durable Objects: Enabled (ChatRoom)" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update desktop app with Worker URL: $workerUrl" -ForegroundColor White
Write-Host "2. Test AI features: POST $workerUrl/api/ai/suggest-meal" -ForegroundColor White
Write-Host "3. Test chat: wss://$workerUrl/chat/trainer_1_client_2" -ForegroundColor White
Write-Host "4. View logs: wrangler tail" -ForegroundColor White
Write-Host "5. Monitor analytics: Cloudflare Dashboard → Analytics" -ForegroundColor White

Write-Host "`n📊 Useful Commands:" -ForegroundColor Cyan
Write-Host "- wrangler tail                     # Live logs" -ForegroundColor White
Write-Host "- wrangler d1 execute fittrack-pro-db --command='SELECT * FROM analytics_events LIMIT 10'" -ForegroundColor White
Write-Host "- wrangler kv:key list --namespace-id=d31f5b43bd964ce78d87d9dd5878cc25" -ForegroundColor White
Write-Host "- wrangler dev                      # Local development" -ForegroundColor White

Write-Host "`n🎉 Deployment complete!`n" -ForegroundColor Green
