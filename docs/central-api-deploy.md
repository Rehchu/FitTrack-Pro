# Central Registration API: Deploy Guide

This service lives in `infra/central-registration/` and provisions a personal Cloudflare Worker per trainer, plus KV, and updates BACKEND_ORIGIN when your tunnel changes.

## Option A: Railway
1. Create a new Railway project.
2. Connect the `infra/central-registration` folder.
3. Set environment variables:
```env
REGISTRATION_SECRET=your-32char-secret
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
PORT=3001
```
4. Deploy and note the public URL (e.g., https://your-api.up.railway.app).

## Option B: Fly.io
1. `cd infra/central-registration`
2. `fly launch` (create an app; accept defaults)
3. `fly secrets set REGISTRATION_SECRET=... CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=...`
4. `fly deploy`

## Desktop App Configuration
In `desktop-app/src/main.js` the app reads:
- `CENTRAL_API_URL` — set to your deployed URL
- `REGISTRATION_SECRET` — must match the API

For Windows builds, set env vars before packaging, or embed them via your CI/CD.

## Cloudflare Token Scopes
The API token must allow:
- Workers Scripts: Edit
- Workers KV: Write
- Account: Read

## Verify
- GET `<CENTRAL_API_URL>/health` → `{ status: "ok" }`
- Run onboarding in the desktop app → A Worker URL should appear.
