# FitTrack Pro — Clean Rebuild (WIP)

We’re starting fresh. The repo has been reset to prepare for a clean, step-by-step rebuild. As features are implemented and verified locally, we’ll update this README and the docs accordingly.

Current status:
- Backend (FastAPI): local-only during rebuild
- Web client (Vite): local-only during rebuild
- Cloudflare resources: reset; will be re-provisioned per feature
- Secrets Store: retained in Cloudflare (intentionally)

How to run locally (temporary):
- Backend: from `backend/`
  - Create and activate the venv if needed
  - Install requirements: `pip install -r requirements.txt`
  - Start API: `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Web client: from `web-client/`
  - Install deps: `npm install`
  - Start dev server: `npm run dev`

What’s next:
1) Re-boot minimal auth flow (login page + backend auth endpoints)
2) Smoke test locally, then deploy new Worker skeleton
3) Iterate feature-by-feature, updating this README and the checklist

Tracking progress:
- See `FEATURE_CHECKLIST.md` for the rebuild items
- We’ll keep commit history focused and incremental per feature

Note: If you’re looking for the previous, fully detailed docs, see the `docs/` folder. Some content may be out of date until re-validated.

