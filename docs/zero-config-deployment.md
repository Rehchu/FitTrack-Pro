# FitTrack Pro - Zero-Config Deployment Guide

## Overview

**Trainers don't need Cloudflare accounts!** Everything happens automatically through our central registration service.

### What Trainers Experience

1. Download and install FitTrack Pro
2. Enter name, email, phone, password
3. Click "Complete Setup"
4. Done! They get a shareable profile URL like `fittrack-johnsmith.workers.dev`

**No Cloudflare signup. No API tokens. No configuration.**

## Architecture (Simplified)

```
Trainer Desktop App
    ↓ (one-time registration)
Your Central API Server (Node.js on Railway/Fly.io/etc.)
    ↓ (creates Worker using your Cloudflare account)
Cloudflare Workers (one per trainer: fittrack-NAME.workers.dev)
    ↓ (proxies API requests to)
Cloudflare Tunnel (connects to trainer's localhost)
    ↓
Trainer's Local Backend (SQLite database on their computer)
```

## Setup Instructions (For You, The Software Provider)

### 1. Deploy Central Registration Service

The central service handles all Cloudflare interactions on behalf of trainers.

#### Option A: Deploy to Railway (Recommended - Free Tier)

```bash
cd infra/central-registration
npm install

# Create account at railway.app
railway login
railway init
railway up

# Set environment variables in Railway dashboard
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token  
REGISTRATION_SECRET=random-secret-key-here
```

#### Option B: Deploy to Fly.io

```bash
cd infra/central-registration
npm install

# Install flyctl and login
fly launch --name fittrack-central
fly secrets set CLOUDFLARE_ACCOUNT_ID=your-id
fly secrets set CLOUDFLARE_API_TOKEN=your-token
fly secrets set REGISTRATION_SECRET=your-secret
fly deploy
```

#### Option C: Deploy to Vercel (Serverless)

```bash
cd infra/central-registration
npm install -g vercel
vercel

# Add environment variables in Vercel dashboard
```

### 2. Get Your Cloudflare Credentials

1. Sign up at [Cloudflare](https://dash.cloudflare.com/sign-up) (free account)
2. Get API Token:
   - Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Click "Create Token"
   - Select "Edit Cloudflare Workers" template
   - Copy the token
3. Get Account ID:
   - Open [Dashboard](https://dash.cloudflare.com/)
   - Copy Account ID from right sidebar

### 3. Configure Desktop App

Update `desktop-app/src/main.js`:

```javascript
const CENTRAL_API_URL = 'https://your-deployed-api.railway.app'  // Your Railway/Fly.io URL
const REGISTRATION_SECRET = 'your-secret-key-here'  // Same as in central service
```

### 4. Build Desktop App

```powershell
cd desktop-app
npm install
npm run build  # Or create installer with electron-builder
```

### 5. Distribute to Trainers

Package the desktop app and distribute it. When trainers install and run it:

1. They enter their info (no Cloudflare stuff)
2. App calls your central API
3. Your API creates a Worker for them
4. Their shareable URL is ready instantly

## Central API Endpoints

### POST /register
Registers a trainer and deploys their Worker.

**Used by**: Desktop app during onboarding

**Request:**
```json
{
  "trainer_name": "John Smith",
  "trainer_email": "john@example.com",
  "trainer_phone": "+1234567890",
  "registration_secret": "your-secret"
}
```

**Response:**
```json
{
  "success": true,
  "trainer_id": "uuid-here",
  "worker_url": "https://fittrack-johnsmith.workers.dev",
  "kv_namespace_id": "namespace-id"
}
```

### POST /update-tunnel
Updates a trainer's Worker with their current tunnel URL.

**Used by**: Desktop app when tunnel restarts

**Request:**
```json
{
  "trainer_id": "uuid-from-registration",
  "tunnel_url": "https://abc-123.trycloudflare.com",
  "registration_secret": "your-secret"
}
```

### GET /health
Health check endpoint.

### GET /trainers
List all registered trainers (admin only).

## Trainer Workflow

### First Launch (Onboarding)

1. App shows signup form
2. Trainer enters:
   - Name
   - Email
   - Phone
   - Password (encrypted locally)
3. Click "Complete Setup"
4. App shows progress:
   - ✓ Saving your information...
   - ✓ Creating your cloud profile...
   - ✓ Starting secure tunnel...
   - ✓ Setup complete!
5. Main app opens

### Daily Use

1. App auto-starts tunnel on launch
2. Trainer manages clients normally
3. When sharing a profile:
   - Click "Share Profile" button
   - Enter client email (optional)
   - Get shareable link: `https://fittrack-trainername.workers.dev/profile/TOKEN`
   - Link works globally, offline-enabled

## Cloudflare Free Plan Limits

Your free Cloudflare account can handle:

- **100,000 requests/day** across ALL trainers
- **Unlimited Workers** (one per trainer)
- **1 GB KV storage total** (shared across all trainers)
- **100,000 KV reads/day**
- **1,000 KV writes/day**

**Recommendation**: Monitor usage in Cloudflare dashboard. If you hit limits, upgrade to Workers Paid ($5/month for 10M requests).

## Security

### Registration Secret
- Set a long random string (32+ characters)
- Same value in central API and desktop app
- Prevents unauthorized Worker creation

### Trainer Passwords
- Hashed with bcrypt (never leaves trainer's computer)
- Stored encrypted in `electron-store`
- Not sent to central API

### Cloudflare API Token
- Only stored on YOUR central server
- Trainers never see it
- Scoped to "Edit Cloudflare Workers" only

## Troubleshooting

### "Registration failed"
- Check central API is running (`curl https://your-api.com/health`)
- Verify REGISTRATION_SECRET matches in app and API
- Check Cloudflare account hasn't hit free plan limits

### "Tunnel startup timeout"
- Ensure cloudflared.exe is bundled with desktop app
- Check backend is running on localhost:8000
- Verify Windows Firewall allows cloudflared

### Share links don't work
- Confirm tunnel is running (check desktop app status)
- Verify Worker was deployed (check Cloudflare dashboard)
- Test backend directly: `http://localhost:8000/public/profile/TOKEN`

## Scaling

### Small Scale (1-50 trainers)
- Central API on Railway free tier
- Cloudflare free plan
- Total cost: $0/month

### Medium Scale (50-500 trainers)
- Central API on Railway Pro ($5/month)
- Cloudflare Workers Paid ($5/month)
- Total cost: $10/month

### Large Scale (500+ trainers)
- Central API on dedicated server
- Cloudflare Workers Paid
- Consider database for trainer registry (PostgreSQL)
- Add monitoring (Sentry, LogRocket)

## Development

### Run Central API Locally

```powershell
cd infra/central-registration
npm install
cp .env.example .env
# Edit .env with your Cloudflare credentials
npm run dev
```

Access at `http://localhost:3001`

### Test Desktop App Locally

```powershell
# Terminal 1: Run central API
cd infra/central-registration
npm run dev

# Terminal 2: Run backend
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 3: Run desktop app
cd desktop-app
npm run dev
```

## Deployment Checklist

Before distributing to trainers:

- [ ] Deploy central API to Railway/Fly.io
- [ ] Set CLOUDFLARE_ACCOUNT_ID in production
- [ ] Set CLOUDFLARE_API_TOKEN in production
- [ ] Generate strong REGISTRATION_SECRET (32+ chars)
- [ ] Update CENTRAL_API_URL in desktop app main.js
- [ ] Update REGISTRATION_SECRET in desktop app main.js
- [ ] Bundle cloudflared.exe with Electron installer
- [ ] Test full onboarding flow on fresh Windows install
- [ ] Set up monitoring for central API
- [ ] Document Cloudflare limits for your own reference

## Support

Trainers should never need to contact Cloudflare support. If they have issues:

1. Check desktop app logs (Help → Toggle Developer Tools)
2. Check if backend is running
3. Restart desktop app
4. Contact YOUR support (not Cloudflare)

---

**Built with**: Node.js, Express, Electron, Cloudflare Workers API
