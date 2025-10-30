# FitTrack Pro - Production Testing Guide

## 🎯 Live Testing Environment

**Worker URL**: https://fittrack-pro-desktop.rehchu1.workers.dev  
**Testing Date**: October 30, 2025  
**Database**: Production D1 (fittrack-pro-db)

---

## 👤 Test Trainer Account

Use this existing demo trainer for testing:

| Field | Value |
|-------|-------|
| **Email** | demo@fittrackpro.com |
| **Password** | *Ask for password from database admin* |
| **User ID** | 1 |
| **Trainer ID** | 1 |
| **Business Name** | FitTrack Pro Demo |
| **Profile Status** | Incomplete (logo_url = null) |

---

## ✅ Quick Production Tests

### 1. Health Check ✅
```powershell
Invoke-RestMethod -Uri "https://fittrack-pro-desktop.rehchu1.workers.dev/health"
```

**Expected**:
```json
{
  "status": "ok",
  "timestamp": 1761800045416,
  "features": {
    "kv": true,
    "d1": true,
    "ai": true,
    "vectorize": true,
    "analytics": true,
    "chat": true
  }
}
```

**Status**: ✅ PASS

---

### 2. Trainer Profile API ✅
```powershell
Invoke-RestMethod -Uri "https://fittrack-pro-desktop.rehchu1.workers.dev/api/trainers/1/profile"
```

**Expected**:
```json
{
  "id": 1,
  "name": "FitTrack Pro Demo",
  "email": "demo@fittrackpro.com",
  "logo_url": null,
  "profile_completed": 0,
  "created_at": 1761792152
}
```

**Status**: ✅ PASS

---

### 3. Trainer Portal (Incomplete Profile) 
Open in browser: https://fittrack-pro-desktop.rehchu1.workers.dev/trainer/1

**Expected**:
- HTTP 403 (Forbidden)
- Page shows: "Profile Incomplete - Please complete your profile in the desktop app"
- Message: "You need to upload your logo before accessing the mobile portal"

**Status**: ⏳ Test in browser

---

### 4. PWA Manifest
```powershell
Invoke-RestMethod -Uri "https://fittrack-pro-desktop.rehchu1.workers.dev/manifest.json"
```

**Expected**:
```json
{
  "name": "FitTrack Pro - Client Profile",
  "short_name": "FitTrack",
  "start_url": "/",
  "display": "standalone"
}
```

**Status**: ⬜ Not tested

---

## 🖥️ Desktop App Production Testing

### Configure Desktop App for Production

The desktop app needs to connect to the production Worker instead of localhost.

**Option 1: Environment Variable**
```powershell
$env:API_URL = "https://fittrack-pro-desktop.rehchu1.workers.dev"
cd "e:\FitTrack Pro 1.1\desktop-app\dist-new\win-unpacked"
.\FitTrack Pro.exe
```

**Option 2: Update Config File**
Edit `desktop-app/src/renderer/config.js` (if it exists) or hardcode in API calls.

---

### Desktop Test Checklist

#### Test 1: QR Code Generation
1. ✅ Launch desktop app
2. ⬜ Click "⚙️ Settings" button
3. ⬜ Expand "QR Code for Mobile Access"
4. ⬜ Verify QR code displays (300x300px PNG)
5. ⬜ Check URL below QR: `https://fittrack-pro-desktop.rehchu1.workers.dev/trainer/1`
6. ⬜ Click "Copy URL" - should copy to clipboard
7. ⬜ Click "Download QR Code" - should download PNG file

**Expected QR URL**: https://fittrack-pro-desktop.rehchu1.workers.dev/trainer/1

---

#### Test 2: Logo Upload
1. ⬜ In Settings, expand "Upload Logo"
2. ⬜ Click "Choose File"
3. ⬜ Select test image (<5MB, PNG/JPG)
4. ⬜ Verify preview appears
5. ⬜ Click "Save"
6. ⬜ Upload should go to: `https://fittrack-pro-desktop.rehchu1.workers.dev/api/trainers/1/profile`
7. ⬜ Check response for R2 URL
8. ⬜ Verify database updated:

```powershell
cd "e:\FitTrack Pro 1.1\integrations\cloudflare"
npx wrangler d1 execute fittrack-pro-db --remote --command="SELECT logo_url, profile_completed FROM trainers WHERE id = 1;"
```

**Expected**:
- `logo_url`: R2 URL (e.g., `https://fittrack-uploads.rehchu1.r2.cloudflarestorage.com/trainers/1/logo.png`)
- `profile_completed`: 1

---

#### Test 3: Password Change
1. ⬜ In Settings, expand "Change Password"
2. ⬜ Enter current password: *[whatever was set]*
3. ⬜ Enter new password: `testpass123` (≥8 chars)
4. ⬜ Confirm: `testpass123`
5. ⬜ Click "Change Password"
6. ⬜ Should call: `https://fittrack-pro-desktop.rehchu1.workers.dev/api/trainers/1/password`
7. ⬜ Verify database updated:

```powershell
npx wrangler d1 execute fittrack-pro-db --remote --command="SELECT password_hash FROM users WHERE id = 1;"
```

**Expected**:
- `password_hash`: New hash value (different from before)
- Length: 64 characters (SHA-256 hex)

---

## 📱 Mobile Testing

### Test 1: QR Code Scan
1. ⬜ Generate QR code in desktop app
2. ⬜ Open camera app on phone
3. ⬜ Scan QR code
4. ⬜ Should open: https://fittrack-pro-desktop.rehchu1.workers.dev/trainer/1
5. ⬜ **Before logo upload**: Should show "Profile Incomplete" (403)
6. ⬜ **After logo upload**: Should redirect or show trainer portal

---

### Test 2: Trainer Portal Access
**After uploading logo**, open on mobile:
- https://fittrack-pro-desktop.rehchu1.workers.dev/trainer/1

**Expected**:
- Page loads successfully (200 OK)
- Shows trainer dashboard HTML
- Displays trainer name and logo
- Responsive design works on mobile

---

### Test 3: PWA Installation
1. ⬜ Open trainer portal on mobile browser
2. ⬜ Browser should prompt "Add to Home Screen"
3. ⬜ Install PWA
4. ⬜ Open from home screen icon
5. ⬜ Should run in standalone mode (no browser UI)

---

## 🔍 Database Verification Commands

### Check Trainer Profile
```powershell
cd "e:\FitTrack Pro 1.1\integrations\cloudflare"

# Full trainer details
npx wrangler d1 execute fittrack-pro-db --remote --command="SELECT t.*, u.email FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.id = 1;"

# Just completion status
npx wrangler d1 execute fittrack-pro-db --remote --command="SELECT business_name, logo_url, profile_completed FROM trainers WHERE id = 1;"

# Check password hash
npx wrangler d1 execute fittrack-pro-db --remote --command="SELECT password_hash FROM users WHERE id = 1;"
```

---

## 🐛 Common Issues

### Issue: Desktop app connects to localhost instead of production
**Fix**: Set environment variable before launching:
```powershell
$env:WORKER_URL = "https://fittrack-pro-desktop.rehchu1.workers.dev"
```

### Issue: Logo upload fails
**Troubleshooting**:
1. Check R2 bucket exists: `npx wrangler r2 bucket list`
2. Verify file size <5MB
3. Check Worker logs: `npx wrangler tail --format pretty`
4. Ensure Content-Type header is multipart/form-data

### Issue: QR code shows localhost URL
**Fix**: Configure desktop app to use production Worker URL (see above)

### Issue: Password change fails
**Possible causes**:
- Current password incorrect (check hash in database)
- New password <8 characters
- Network error (check Worker logs)

---

## 📊 Test Results Log

### Test Session: October 30, 2025

| Test | Status | Notes |
|------|--------|-------|
| Health endpoint | ✅ PASS | All features enabled |
| Trainer profile API | ✅ PASS | Returns correct data with JOIN |
| Trainer portal (before logo) | ⏳ Testing | Should show 403 |
| QR code generation | ⬜ Not tested | |
| Logo upload | ⬜ Not tested | |
| Profile completion flag | ⬜ Not tested | |
| Trainer portal (after logo) | ⬜ Not tested | |
| Password change | ⬜ Not tested | |
| Mobile QR scan | ⬜ Not tested | |
| PWA installation | ⬜ Not tested | |

---

## ✅ Sign-Off Checklist

Before approving for final release:

- [ ] Health check passes
- [ ] Trainer profile API returns correct data
- [ ] QR code generates with correct production URL
- [ ] Logo uploads to R2 successfully
- [ ] Database updates `logo_url` and `profile_completed`
- [ ] Trainer portal blocks access before logo upload
- [ ] Trainer portal allows access after logo upload
- [ ] Password change updates hash in users table
- [ ] QR code scannable on mobile
- [ ] Mobile portal responsive
- [ ] PWA installable

**Tester**: _______________  
**Date**: _______________  
**Recommendation**: [ ] APPROVE [ ] NEEDS FIXES

---

## 🚀 Next Steps After Testing

1. **If tests pass**:
   - Create installer with production Worker URL
   - Update documentation
   - Prepare for beta release

2. **If issues found**:
   - Log bugs in GitHub Issues
   - Fix critical issues
   - Re-test

3. **Production readiness**:
   - Upgrade password hashing to bcrypt
   - Add rate limiting
   - Set up monitoring alerts
   - Configure custom domain (optional)
