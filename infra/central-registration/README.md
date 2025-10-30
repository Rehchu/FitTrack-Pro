# FitTrack Pro - Central Registration Service

This is a lightweight central backend that handles Cloudflare Worker deployment for all trainers.

## Architecture

```
Trainer Desktop App
    ↓ (registers via HTTPS)
Your Central API (Node.js/Express)
    ↓ (creates Worker using your CF account)
Cloudflare Workers (fittrack-trainername.yourcompany.workers.dev)
    ↓ (proxies to)
Trainer's Local Backend (via ngrok or cloudflared tunnel)
```

## Setup

1. Deploy this service to any hosting (Vercel, Railway, Fly.io, etc.)
2. Set environment variables:
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
   - `CLOUDFLARE_API_TOKEN`: Your API token with Workers edit permission
   - `REGISTRATION_SECRET`: Random string to authenticate desktop app requests

3. Desktop app only needs to know:
   - Your central API URL (e.g., `https://fittrack-central.yourcompany.com`)
   - No Cloudflare credentials

## API Endpoints

### POST /register
Register a new trainer and deploy their Worker.

**Request:**
```json
{
  "trainer_name": "John Smith",
  "trainer_email": "john@example.com",
  "trainer_phone": "+1234567890",
  "registration_secret": "your-secret-key"
}
```

**Response:**
```json
{
  "success": true,
  "worker_url": "https://fittrack-johnsmith.yourcompany.workers.dev",
  "kv_namespace_id": "abc123...",
  "trainer_id": "uuid-here"
}
```

### POST /update-tunnel
Update a trainer's Worker with their current tunnel URL.

**Request:**
```json
{
  "trainer_id": "uuid-here",
  "tunnel_url": "https://abc-123.trycloudflare.com",
  "registration_secret": "your-secret-key"
}
```

## Files

- `server.js` - Express API server
- `worker-template.js` - Cloudflare Worker template
- `package.json` - Dependencies
