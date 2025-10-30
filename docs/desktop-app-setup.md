# FitTrack Pro - Desktop App Setup Guide

## Overview

The FitTrack Pro desktop app includes **automatic cloud deployment** that sets up your shareable client profiles on Cloudflare's free edge network. On first launch, you'll complete a one-time setup wizard that:

1. Creates your trainer account (stored locally, encrypted)
2. Deploys a Cloudflare Worker with your custom URL (`fittrack-yourname.workers.dev`)
3. Sets up offline caching for global client access
4. Starts a secure tunnel to connect your local backend to the cloud

## Prerequisites

- Node.js 16+ installed
- A free Cloudflare account ([sign up here](https://dash.cloudflare.com/sign-up))
- Windows 10/11 (PowerShell 5.1+)
- Backend server running on `localhost:8000`

## First-Time Setup (Onboarding Wizard)

### Step 1: Launch the Desktop App

```powershell
cd "desktop-app"
npm install
npm start
```

### Step 2: Complete Trainer Information

You'll be prompted to enter:

- **Full Name**: Your professional name (used in your Worker URL)
- **Email**: Contact email
- **Phone**: Contact number
- **Password**: Local login password (encrypted with bcrypt, never leaves your computer)

Click **Next: Cloud Setup** to continue.

### Step 3: Configure Cloudflare (Free Forever)

#### Get Your Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Select **Edit Cloudflare Workers** template
4. Copy the generated token
5. Paste into the **Cloudflare API Token** field

#### Get Your Account ID

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Look at the **right sidebar** under your account name
3. Copy the **Account ID** (32-character string)
4. Paste into the **Account ID** field

Click **Deploy to Cloud** to start automatic setup.

### Step 4: Wait for Deployment

The app will automatically:

1. ✓ Save your credentials securely (encrypted locally)
2. ✓ Create a KV namespace for offline storage
3. ✓ Deploy your Worker to `fittrack-yourname.workers.dev`
4. ✓ Start a secure tunnel connecting your local backend
5. ✓ Configure the Worker to proxy requests to your tunnel

This takes about 30-60 seconds. Progress updates will appear on screen.

### Step 5: Setup Complete

You'll see your custom Worker URL:

```
fittrack-johnsmith.workers.dev
```

This is your **permanent profile URL** that clients can access to view their progress.

## How Shareable Profiles Work

### Creating a Share Link

1. Open the desktop app (after onboarding)
2. View your client list
3. Click **Share Profile** next to a client's name
4. Enter the client's email (optional - link works either way)
5. Click **Generate Link**

The app will:

- Generate a secure token (32-byte URL-safe)
- Create a shareable URL: `https://fittrack-yourname.workers.dev/profile/ABC123XYZ...`
- (Optional) Email the link to the client
- Set expiration (default: 30 days, configurable)

### What Clients See

Clients can access their profile at the share URL and view:

- ✓ **Body measurement charts** (weight, waist, body fat %, etc.)
- ✓ **Progress photos** (all uploaded photos in chronological order)
- ✓ **Nutrition summary** (last 30 days of meals, avg calories, macros)
- ✓ **Latest measurements** (most recent full body measurements)

### Offline Access

Once a client visits their profile link:

1. The Cloudflare Worker caches the data at the edge (globally distributed)
2. The client's browser service worker caches the page locally
3. Future visits load instantly, even if your backend is offline
4. Data auto-updates when the backend comes back online

## Technical Architecture

```
Client Browser
    ↓ (visits https://fittrack-you.workers.dev/profile/TOKEN)
Cloudflare Worker (Edge Cache + KV Fallback)
    ↓ (proxies /api/* requests)
Cloudflare Tunnel (https://xxx.trycloudflare.com)
    ↓ (tunnels to localhost)
Your Backend (localhost:8000)
    ↓ (reads from)
SQLite Database (local disk)
```

### Components

1. **Desktop App (Electron)**
   - Trainer signup/onboarding UI
   - Cloudflare API integration
   - Auto-deployment orchestration
   - Tunnel management (cloudflared.exe)

2. **Backend (FastAPI)**
   - ShareToken model with expiration
   - `/clients/:id/share` endpoint (create share link)
   - `/public/profile/:token` endpoint (public read access, no auth)
   - SMTP email integration (optional)

3. **Cloudflare Worker (Edge Proxy)**
   - Caches public profile GET requests for 24h in KV
   - Falls back to KV cache if backend unreachable
   - Serves static assets (HTML/JS/CSS) from edge cache (1 day)
   - Custom URL: `fittrack-TRAINERNAME.workers.dev`

4. **Web Client (React + Service Worker)**
   - Public profile page at `/profile/:token` (no auth)
   - Beautiful dark theme matching main app
   - Charts (weight, waist, body fat) using Chart.js
   - Progress photo gallery
   - Offline-capable via service worker

## Configuration Files

### Desktop App: `desktop-app/package.json`

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "bcrypt": "^5.1.1",
    "electron": "^25.0.0",
    "electron-store": "^8.1.0"
  }
}
```

### Backend: `.env`

```env
# Database
DATABASE_URL=sqlite:///./fittrack.db

# Cloudflare (optional - set by desktop app)
WORKER_URL=https://fittrack-yourname.workers.dev

# SMTP (optional - for email share links)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Cloudflare Worker Bindings

- **KV Namespace**: `FITTRACK_KV` (created automatically by desktop app)
- **Environment Variable**: `BACKEND_ORIGIN` (tunnel URL, updated automatically)

## Security

### Password Storage

- Trainer passwords are hashed with **bcrypt** (10 rounds)
- Stored in `electron-store` with AES-256 encryption
- Never transmitted over network
- Never stored in Cloudflare

### Share Tokens

- Generated with `secrets.token_urlsafe(32)` (cryptographically secure)
- 32 bytes of randomness = 256 bits entropy
- Unique index prevents duplicates
- Expiration enforced server-side
- Can be deactivated manually

### Cloudflare API Tokens

- Stored encrypted in `electron-store`
- Only used for initial deployment + tunnel updates
- Permissions: "Edit Cloudflare Workers" (minimal scope)

### Tunnel Security

- Uses Cloudflare's trusted tunnel infrastructure
- TLS-encrypted connection (backend → tunnel → Worker)
- Tunnel URL changes on restart (ephemeral)
- Worker updated automatically with new tunnel URL

## Troubleshooting

### "Failed to create KV namespace"

- Check your Cloudflare API token has "Edit Cloudflare Workers" permission
- Verify Account ID is correct (32 characters)
- Ensure you haven't hit the free plan KV limit (1 namespace/account)

### "Tunnel startup timeout"

- Ensure `cloudflared.exe` exists in project root
- Check Windows Firewall isn't blocking cloudflared
- Verify no other process is using port 8000
- Check backend is running (`http://localhost:8000/health`)

### "Worker deployment failed"

- Check API token hasn't expired
- Verify Worker name doesn't conflict with existing Worker
- Ensure you're on Cloudflare Free plan (Workers allowed)

### Share links return 404

- Verify backend is running
- Check tunnel is active (desktop app running)
- Confirm share token hasn't expired
- Test direct backend access: `http://localhost:8000/public/profile/TOKEN`

### Emails not sending

- Verify SMTP credentials in `.env`
- Check SMTP_HOST/PORT/USER/PASS are set
- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833)
- Email is optional - share links work without it

## Development

### Start Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Start Web Client

```powershell
cd web-client
npm install
npm run dev
```

### Start Desktop App (Dev Mode)

```powershell
cd desktop-app
npm install
npm run dev  # Runs Vite + Electron concurrently
```

## Deployment Checklist

Before giving the desktop app to trainers:

- [ ] Replace `fittrack-pro-secure-key-change-in-production` in `main.js` with a unique 32-byte key
- [ ] Bundle `cloudflared.exe` in the installer
- [ ] Set up SMTP relay for production email sending
- [ ] Create installer (electron-builder or similar)
- [ ] Test onboarding flow on fresh Windows install
- [ ] Document Cloudflare free plan limits for trainers

## Cloudflare Free Plan Limits

- **Workers**: 100,000 requests/day (plenty for small trainers)
- **KV Namespaces**: 1 namespace (1 per trainer)
- **KV Storage**: 1 GB (thousands of client profiles)
- **KV Reads**: 100,000/day
- **KV Writes**: 1,000/day
- **Workers.dev Subdomain**: Free forever

For trainers with >100 clients or high traffic, recommend Cloudflare Workers Paid ($5/month for 10M requests).

## Support

For issues or questions:

1. Check this README troubleshooting section
2. Review desktop app console logs (View → Toggle Developer Tools)
3. Check backend logs in terminal
4. Review Cloudflare Worker logs in dashboard

---

**Built with**: Electron, React, FastAPI, SQLAlchemy, Cloudflare Workers, Chart.js, MUI
