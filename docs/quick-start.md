# FitTrack Pro Quick Start (Windows)

This guide walks you through installing, onboarding, sharing a client profile, and sending a test email.

## Requirements
- Windows 10 or 11
- Internet connection (for first-time setup/deploy)
- SMTP credentials (Gmail app password, SendGrid, or Mailgun) for email tests

## 1) Install and Launch
1. Download and run the FitTrack Pro installer.
2. Launch the app from the desktop/start menu.

## 2) Onboarding (Zero-Config)
1. Fill in your name, email, and phone.
2. Click Complete Setup. The app will:
   - Register you with the central API
   - Start a secure tunnel to your local backend
   - Update your personal Cloudflare Worker with your tunnel
3. When ready, you’ll see your Worker URL at the top of the desktop app.

## 3) Add a Test Client
1. In the Clients section, enter a name and email.
2. Click Create Client. Your client appears in the list.

## 4) Share a Client Profile
1. Click Share Profile next to a client.
2. A share URL is generated and copied to your clipboard.
3. Open the link in a browser to view the public profile.

Tip: The link is served via your Worker and works offline after first visit thanks to caching.

## 5) Send a Test Email (Optional)
1. Click Email next to a client.
2. Edit subject/body; enable Attach PDF or Attach Avatar if you like.
3. Click Send.

Configure SMTP in backend .env:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Troubleshooting
- If sharing fails: ensure the app shows a Worker URL and the backend is running.
- If email fails: double-check SMTP settings and app password/2FA.
- If the Worker isn’t updating: verify central API URL and registration secret.

## Useful URLs
- Local backend docs: http://localhost:8000/docs
- Worker health: https://<your-worker>.workers.dev/health
