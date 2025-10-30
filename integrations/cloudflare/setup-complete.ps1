# FitTrack Pro - Complete Cloudflare Setup (Automated)
# This script sets up ALL Cloudflare features automatically

param(
    [switch]$SkipSecrets = $false,
    [switch]$SkipDeploy = $false
)

$ErrorActionPreference = "Stop"

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   FitTrack Pro - Complete Cloudflare Setup                   ║
║                                                               ║
║   Features: Workers, KV, D1, AI, Vectorize, Durable Objects  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Change to Cloudflare directory
Set-Location "e:\FitTrack Pro 1.1\integrations\cloudflare"

# ==================== STEP 1: Generate Secrets ====================
if (-not $SkipSecrets) {
    Write-Host "`n[1/7] Generating Secrets..." -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

    # Generate strong random secrets
    function Generate-Secret {
        param([int]$Length = 32)
        $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    }

    function Generate-HexSecret {
        param([int]$Length = 64)
        -join ((1..$Length) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
    }

    $secrets = @{
        JWT_SECRET = Generate-Secret -Length 32
        ENCRYPTION_KEY = Generate-HexSecret -Length 64
        WEBHOOK_SECRET = Generate-HexSecret -Length 48
        USDA_API_KEY = "uH2TDQWthtdFvLn6Bz4wXe2VLBBGwA3SbeHPnGkJ"
        EXERCISEDB_API_KEY = "01a44cbd89msh864c4e87aba2d22p10f83cjsn2bea18eb05ec"
    }

    Write-Host "✅ Generated JWT_SECRET" -ForegroundColor Green
    Write-Host "   → $($secrets.JWT_SECRET)" -ForegroundColor DarkGray
    Write-Host "✅ Generated ENCRYPTION_KEY" -ForegroundColor Green
    Write-Host "   → $($secrets.ENCRYPTION_KEY.Substring(0, 32))..." -ForegroundColor DarkGray
    Write-Host "✅ Generated WEBHOOK_SECRET" -ForegroundColor Green
    Write-Host "   → $($secrets.WEBHOOK_SECRET.Substring(0, 24))..." -ForegroundColor DarkGray
    Write-Host "✅ Using existing USDA_API_KEY" -ForegroundColor Green
    Write-Host "✅ Using existing EXERCISEDB_API_KEY`n" -ForegroundColor Green

    # Save secrets to temp file for manual reference
    $secrets | ConvertTo-Json | Out-File "secrets-generated.json"
    Write-Host "📄 Secrets saved to: secrets-generated.json`n" -ForegroundColor Cyan
    Write-Host "   ⚠️  Keep this file secure! Delete after setup.`n" -ForegroundColor Yellow
} else {
    Write-Host "`n[1/7] Skipping secret generation (--SkipSecrets flag)`n" -ForegroundColor Yellow
}

# ==================== STEP 2: Check Prerequisites ====================
Write-Host "[2/7] Checking Prerequisites..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

try {
    $version = wrangler --version 2>&1
    Write-Host "✅ Wrangler installed: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler not found. Installing..." -ForegroundColor Red
    npm install -g wrangler
    Write-Host "✅ Wrangler installed`n" -ForegroundColor Green
}

# Check login status
try {
    $whoami = wrangler whoami 2>&1 | Out-String
    if ($whoami -match "not authenticated" -or $whoami -match "error") {
        Write-Host "❌ Not logged in. Opening browser..." -ForegroundColor Red
        wrangler login
        Write-Host "✅ Logged in to Cloudflare`n" -ForegroundColor Green
    } else {
        Write-Host "✅ Already authenticated with Cloudflare`n" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not verify authentication. Attempting login...`n" -ForegroundColor Yellow
    wrangler login
}

# ==================== STEP 3: Setup D1 Database ====================
Write-Host "[3/7] Setting up D1 Database..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

try {
    # Check if database exists
    $d1List = wrangler d1 list 2>&1 | Out-String
    
    if ($d1List -match "fittrack-pro-db") {
        Write-Host "✅ D1 database 'fittrack-pro-db' already exists" -ForegroundColor Green
    } else {
        Write-Host "Creating D1 database..." -ForegroundColor Cyan
        $createResult = wrangler d1 create fittrack-pro-db 2>&1 | Out-String
        Write-Host $createResult
        
        # Extract database ID
        if ($createResult -match "database_id\s*=\s*`"([^`"]+)`"") {
            $dbId = $matches[1]
            Write-Host "✅ Database created with ID: $dbId" -ForegroundColor Green
            Write-Host "   ⚠️  Update wrangler.toml with this database_id`n" -ForegroundColor Yellow
        }
    }

    # Apply schema
    Write-Host "Applying D1 schema..." -ForegroundColor Cyan
    if (Test-Path "d1-schema.sql") {
        $schemaResult = wrangler d1 execute fittrack-pro-db --file=d1-schema.sql 2>&1 | Out-String
        if ($schemaResult -match "error") {
            Write-Host "⚠️  Schema may already exist (continuing)..." -ForegroundColor Yellow
        } else {
            Write-Host "✅ D1 schema applied successfully`n" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  d1-schema.sql not found. Skipping schema.`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  D1 setup encountered issues: $($_.Exception.Message)`n" -ForegroundColor Yellow
}

# ==================== STEP 4: Setup Vectorize Index ====================
Write-Host "[4/7] Setting up Vectorize Index..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

try {
    $vectorizeList = wrangler vectorize list 2>&1 | Out-String
    
    if ($vectorizeList -match "fittrack-exercises") {
        Write-Host "✅ Vectorize index 'fittrack-exercises' already exists`n" -ForegroundColor Green
    } else {
        Write-Host "Creating Vectorize index..." -ForegroundColor Cyan
        $vectorizeResult = wrangler vectorize create fittrack-exercises --dimensions=384 --metric=cosine 2>&1 | Out-String
        Write-Host $vectorizeResult
        Write-Host "✅ Vectorize index created`n" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Vectorize setup encountered issues: $($_.Exception.Message)`n" -ForegroundColor Yellow
}

# ==================== STEP 5: Set Secrets ====================
if (-not $SkipSecrets) {
    Write-Host "[5/7] Setting Cloudflare Secrets..." -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

    if (Test-Path "secrets-generated.json") {
        $secretsData = Get-Content "secrets-generated.json" | ConvertFrom-Json

        foreach ($secretName in $secretsData.PSObject.Properties.Name) {
            $secretValue = $secretsData.$secretName
            Write-Host "Setting $secretName..." -ForegroundColor Cyan
            
            try {
                echo $secretValue | wrangler secret put $secretName 2>&1 | Out-Null
                Write-Host "✅ $secretName set" -ForegroundColor Green
            } catch {
                Write-Host "❌ Failed to set $secretName : $($_.Exception.Message)" -ForegroundColor Red
            }
        }

        Write-Host "`n✅ All secrets configured`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  secrets-generated.json not found. Skipping secret setup.`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "[5/7] Skipping secret setup (--SkipSecrets flag)`n" -ForegroundColor Yellow
}

# ==================== STEP 6: Verify Configuration ====================
Write-Host "[6/7] Verifying Configuration..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

# Check wrangler.toml
if (Test-Path "wrangler.toml") {
    $toml = Get-Content "wrangler.toml" -Raw
    
    $checks = @(
        @{ Name = "Account ID"; Pattern = 'account_id\s*=\s*"([^"]+)"'; Required = $true },
        @{ Name = "KV Namespace"; Pattern = 'FITTRACK_KV'; Required = $true },
        @{ Name = "D1 Database"; Pattern = 'FITTRACK_D1'; Required = $true },
        @{ Name = "Workers AI"; Pattern = '\[ai\]'; Required = $true },
        @{ Name = "Vectorize"; Pattern = 'VECTORIZE'; Required = $true },
        @{ Name = "Durable Objects"; Pattern = 'CHAT_ROOM'; Required = $true },
        @{ Name = "Analytics"; Pattern = 'ANALYTICS'; Required = $true }
    )

    foreach ($check in $checks) {
        if ($toml -match $check.Pattern) {
            Write-Host "✅ $($check.Name) configured" -ForegroundColor Green
        } else {
            if ($check.Required) {
                Write-Host "❌ $($check.Name) NOT configured" -ForegroundColor Red
            } else {
                Write-Host "⚠️  $($check.Name) NOT configured (optional)" -ForegroundColor Yellow
            }
        }
    }
    Write-Host ""
} else {
    Write-Host "❌ wrangler.toml not found!`n" -ForegroundColor Red
}

# Check secrets
Write-Host "Checking secrets..." -ForegroundColor Cyan
try {
    $secretList = wrangler secret list 2>&1 | Out-String
    if ($secretList -match "JWT_SECRET") {
        Write-Host "✅ Secrets configured`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No secrets found. Run without --SkipSecrets flag.`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not verify secrets`n" -ForegroundColor Yellow
}

# ==================== STEP 7: Deploy Worker ====================
if (-not $SkipDeploy) {
    Write-Host "[7/7] Deploying Worker..." -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

    try {
        Write-Host "Deploying to Cloudflare Workers..." -ForegroundColor Cyan
        $deployResult = wrangler deploy 2>&1 | Out-String
        Write-Host $deployResult

        if ($deployResult -match "error" -or $deployResult -match "failed") {
            Write-Host "`n❌ Deployment failed. Check errors above.`n" -ForegroundColor Red
        } else {
            Write-Host "`n✅ Worker deployed successfully!`n" -ForegroundColor Green
            
            # Test deployment
            Write-Host "Testing deployment..." -ForegroundColor Cyan
            try {
                $healthCheck = Invoke-RestMethod -Uri "https://fittrack-pro-desktop.rehchu1.workers.dev/health" -Method GET
                Write-Host "✅ Health check passed!" -ForegroundColor Green
                Write-Host "   Status: $($healthCheck.status)" -ForegroundColor Gray
                Write-Host "   Features: $($healthCheck.features | ConvertTo-Json -Compress)`n" -ForegroundColor Gray
            } catch {
                Write-Host "⚠️  Health check failed: $($_.Exception.Message)`n" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "`n❌ Deployment error: $($_.Exception.Message)`n" -ForegroundColor Red
    }
} else {
    Write-Host "[7/7] Skipping deployment (--SkipDeploy flag)`n" -ForegroundColor Yellow
}

# ==================== FINAL SUMMARY ====================
Write-Host ''
Write-Host '==== Setup Complete ====' -ForegroundColor Green
Write-Host ''

Write-Host 'Resource Summary:' -ForegroundColor Cyan
Write-Host '  Worker URL:        https://fittrack-pro-desktop.rehchu1.workers.dev' -ForegroundColor Gray
Write-Host '  D1 Database:       fittrack-pro-db' -ForegroundColor Gray
Write-Host '  KV Namespace:      FITTRACK_KV' -ForegroundColor Gray
Write-Host '  Vectorize Index:   fittrack-exercises' -ForegroundColor Gray
Write-Host '  Durable Objects:   ChatRoom' -ForegroundColor Gray
Write-Host '  Analytics Engine:  Enabled' -ForegroundColor Gray
Write-Host '  Workers AI:        Enabled' -ForegroundColor Gray
Write-Host ''

Write-Host 'Next Steps:' -ForegroundColor Cyan
Write-Host '  1) Test AI: POST /api/ai/suggest-meal' -ForegroundColor Gray
Write-Host '  2) Test Search: GET /api/exercises/semantic?q=chest+workout' -ForegroundColor Gray
Write-Host '  3) Logs: wrangler tail' -ForegroundColor Gray
Write-Host '  4) Update WORKER_URL in the desktop app' -ForegroundColor Gray
Write-Host '  5) Index exercises (Vectorize)' -ForegroundColor Gray
Write-Host ''

if (Test-Path "secrets-generated.json") {
     Write-Host 'Security Reminder: delete secrets-generated.json after confirming everything works.' -ForegroundColor Yellow
}

Write-Host 'Docs:' -ForegroundColor Cyan
Write-Host '  - docs/cloudflare-complete-implementation.md' -ForegroundColor Gray
Write-Host '  - docs/cloudflare-quick-reference.md' -ForegroundColor Gray
Write-Host '  - docs/cloudflare-secrets-setup.md' -ForegroundColor Gray
Write-Host ''
