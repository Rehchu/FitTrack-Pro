# 🔐 FitTrack Pro - Required Secrets Setup

## Secret Store ID: `10fbc73102514b27986ecff5ec2d4ac7`

---

## ⚡ Quick Setup Commands

### Step 1: Login to Cloudflare

```powershell
# Install wrangler if not already installed
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### Step 2: Set Required Secrets

```powershell
# Navigate to cloudflare directory
cd "e:\FitTrack Pro 1.1\integrations\cloudflare"

# Set each secret (wrangler will prompt for value)
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
wrangler secret put WEBHOOK_SECRET
wrangler secret put USDA_API_KEY
wrangler secret put EXERCISEDB_API_KEY
```

---

## 🔑 Secret Values

### 1. JWT_SECRET (Required)
**Purpose**: Sign and verify authentication tokens

**Generate**:
```powershell
# PowerShell method
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Or use online generator: https://generate-secret.vercel.app/32
```

**Example Value**:
```
a7f8d9e2b1c4f5g6h3i0j7k8l9m2n5o8
```

**Set Command**:
```powershell
wrangler secret put JWT_SECRET
# When prompted, paste the generated value
```

---

### 2. ENCRYPTION_KEY (Required)
**Purpose**: Encrypt sensitive data at rest in D1/KV

**Generate**:
```powershell
# PowerShell method
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Or: https://generate-secret.vercel.app/64
```

**Example Value**:
```
9f8e7d6c5b4a3210fedcba9876543210abcdef1234567890abcdef12345678
```

**Set Command**:
```powershell
wrangler secret put ENCRYPTION_KEY
# Paste the generated 64-character hex string
```

---

### 3. WEBHOOK_SECRET (Required)
**Purpose**: Validate webhooks from Samsung Health and other services

**Generate**:
```powershell
# PowerShell method
-join ((48..57) + (97..102) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

**Example Value**:
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2
```

**Set Command**:
```powershell
wrangler secret put WEBHOOK_SECRET
# Paste the generated value
```

---

### 4. USDA_API_KEY (Required)
**Purpose**: Access USDA FoodData Central API for nutrition data

**Value** (already have this):
```
uH2TDQWthtdFvLn6Bz4wXe2VLBBGwA3SbeHPnGkJ
```

**Set Command**:
```powershell
wrangler secret put USDA_API_KEY
# Paste: uH2TDQWthtdFvLn6Bz4wXe2VLBBGwA3SbeHPnGkJ
```

---

### 5. EXERCISEDB_API_KEY (Required)
**Purpose**: Access ExerciseDB API via RapidAPI

**Value** (already have this):
```
01a44cbd89msh864c4e87aba2d22p10f83cjsn2bea18eb05ec
```

**Set Command**:
```powershell
wrangler secret put EXERCISEDB_API_KEY
# Paste: 01a44cbd89msh864c4e87aba2d22p10f83cjsn2bea18eb05ec
```

---

## 🔓 Optional Secrets

### 6. OPENAI_API_KEY (Optional)
**Purpose**: Fallback for Workers AI if Cloudflare AI fails

**Where to Get**:
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)

**Example Value**:
```
sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

**Set Command**:
```powershell
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key
```

**Note**: Not required if using Workers AI exclusively

---

### 7. SMTP_PASSWORD (Optional)
**Purpose**: Send emails via Worker (Gmail App Password)

**Where to Get**:
1. Go to: https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to: https://myaccount.google.com/apppasswords
4. Create app password for "FitTrack Pro"
5. Copy the 16-character password

**Example Value**:
```
abcd efgh ijkl mnop
```

**Set Command**:
```powershell
wrangler secret put SMTP_PASSWORD
# Paste the Gmail App Password (without spaces)
```

**Note**: Only needed if sending emails from Worker

---

### 8. DATABASE_URL (Optional - for Hyperdrive)
**Purpose**: Connect to PostgreSQL/MySQL via Hyperdrive

**Format**:
```
postgresql://username:password@host:5432/database_name
# or
mysql://username:password@host:3306/database_name
```

**Example Value**:
```
postgresql://fittrack_user:mypassword@db.example.com:5432/fittrack_db
```

**Set Command**:
```powershell
wrangler secret put DATABASE_URL
# Paste your database connection string
```

**Note**: Not needed if using SQLite (current setup) or D1

---

## ✅ Verification

### Check Which Secrets Are Set

```powershell
wrangler secret list
```

**Expected Output**:
```
Secret Name            Created
JWT_SECRET            2025-10-29
ENCRYPTION_KEY        2025-10-29
WEBHOOK_SECRET        2025-10-29
USDA_API_KEY          2025-10-29
EXERCISEDB_API_KEY    2025-10-29
```

### Test Secrets in Worker

```powershell
# Deploy worker
wrangler deploy

# Test health endpoint (should show features enabled)
curl https://fittrack-pro-desktop.rehchu1.workers.dev/health
```

---

## 🔒 Security Best Practices

### 1. Never Commit Secrets to Git
```gitignore
# Already in .gitignore
wrangler.toml
.env
*.key
*.pem
```

### 2. Rotate Secrets Regularly
```powershell
# Update a secret (old value is replaced)
wrangler secret put JWT_SECRET
```

### 3. Use Different Secrets for Dev/Prod
```powershell
# Development secrets (use wrangler dev)
wrangler secret put JWT_SECRET --env development

# Production secrets
wrangler secret put JWT_SECRET --env production
```

### 4. Delete Unused Secrets
```powershell
wrangler secret delete OLD_SECRET_NAME
```

---

## 🎯 All-in-One Setup Script

Save this as `setup-secrets.ps1`:

```powershell
# FitTrack Pro - Automated Secret Setup

Write-Host "🔐 Setting up Cloudflare Secrets for FitTrack Pro`n" -ForegroundColor Cyan

cd "e:\FitTrack Pro 1.1\integrations\cloudflare"

# Generate secrets automatically
Write-Host "Generating secrets..." -ForegroundColor Yellow

$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
$encryptionKey = -join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})
$webhookSecret = -join ((48..57) + (97..102) | Get-Random -Count 48 | % {[char]$_})

Write-Host "`n✅ Generated JWT_SECRET: $jwtSecret" -ForegroundColor Green
Write-Host "✅ Generated ENCRYPTION_KEY: $encryptionKey" -ForegroundColor Green
Write-Host "✅ Generated WEBHOOK_SECRET: $webhookSecret`n" -ForegroundColor Green

# Set secrets
Write-Host "Setting secrets in Cloudflare..." -ForegroundColor Yellow

echo $jwtSecret | wrangler secret put JWT_SECRET
echo $encryptionKey | wrangler secret put ENCRYPTION_KEY
echo $webhookSecret | wrangler secret put WEBHOOK_SECRET
echo "uH2TDQWthtdFvLn6Bz4wXe2VLBBGwA3SbeHPnGkJ" | wrangler secret put USDA_API_KEY
echo "01a44cbd89msh864c4e87aba2d22p10f83cjsn2bea18eb05ec" | wrangler secret put EXERCISEDB_API_KEY

Write-Host "`n✅ All secrets set successfully!" -ForegroundColor Green

# Verify
Write-Host "`nVerifying secrets..." -ForegroundColor Yellow
wrangler secret list

Write-Host "`n🎉 Setup complete! You can now deploy the worker." -ForegroundColor Green
```

**Run it**:
```powershell
.\setup-secrets.ps1
```

---

## 📋 Secret Summary Table

| Secret Name | Type | Where Used | Required | Already Have |
|-------------|------|------------|----------|--------------|
| JWT_SECRET | Generated | Token validation | ✅ Yes | ❌ No - Generate |
| ENCRYPTION_KEY | Generated | Data encryption | ✅ Yes | ❌ No - Generate |
| WEBHOOK_SECRET | Generated | Webhook validation | ✅ Yes | ❌ No - Generate |
| USDA_API_KEY | API Key | Nutrition data | ✅ Yes | ✅ Yes |
| EXERCISEDB_API_KEY | API Key | Exercise data | ✅ Yes | ✅ Yes |
| OPENAI_API_KEY | API Key | AI fallback | ⏳ Optional | ❌ No - Skip for now |
| SMTP_PASSWORD | Gmail App | Email sending | ⏳ Optional | ❌ No - Skip for now |
| DATABASE_URL | Connection | Hyperdrive | ⏳ Optional | ❌ No - Not needed |

**Total Required**: 5 secrets
**Already Have**: 2 secrets (USDA, ExerciseDB)
**Need to Generate**: 3 secrets (JWT, Encryption, Webhook)

---

## 🚀 Next Steps

1. ✅ Generate the 3 missing secrets (JWT, Encryption, Webhook)
2. ✅ Run `wrangler secret put` for each secret
3. ✅ Verify with `wrangler secret list`
4. ✅ Deploy worker: `wrangler deploy`
5. ✅ Test: `curl https://fittrack-pro-desktop.rehchu1.workers.dev/health`

**Estimated Time**: 5 minutes
