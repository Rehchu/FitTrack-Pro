# Upstream repository analysis (summary)

This file summarizes the README-level findings for the repositories you asked to merge. This is an initial analysis to identify useful components, assets, and license considerations.

## Rehchu/super-spork
- Tech: Convex backend + Vite frontend (README indicates a Chef+Convex setup).
- Useful bits: Fast prototyping with Convex; may include API routes and UI that map to fitness features.
- License: not yet determined (need to fetch LICENSE file).
- Recommendation: Use UI and feature ideas; Convex is a hosted backend product — we will port needed server logic to FastAPI to keep backend local.

## williamniemiec/nfit-app
- Tech: React Native mobile app.
- Useful bits: UI patterns for workouts/screens, redux store structure, assets, and service abstractions.
- License: present (see repo badge) — check LICENSE file before copying code.
- Recommendation: Reuse UI flows and assets (with attribution/compat license compliance) and adapt logic to desktop/web UI.

## naibaf-1/GymTrim
- Tech: Android app; Apache 2.0 license.
- Features: Plans & exercises CRUD, training mode (tick repetitions), progress tracking, import/export, calculators (BMI), translations.
- Useful bits: Exercise/plan model design, persistence approach, import/export formats, and localization support.
- Recommendation: Reuse models/ideas and any Apache-2.0 compatible code or assets (observe license notices and attribution).

## wger-project/wger
- Tech: Full-featured self-hostable fitness manager (Python/Django + REST API), AGPL-3.0 license.
- Features: Workouts, diet plans, food DB (Open Food Facts), progress gallery, multi-user, powerful REST API, docker-based deployment.
- Useful bits: Comprehensive backend models, nutrition tracking, API design, and deployment patterns.
- License note: AGPL-3.0 is *copyleft* and would force our combined project to adopt AGPL for derivative distribution if we reuse code. For a project where we want flexible licensing, avoid directly copying AGPL source code; instead, reimplement similar models/ideas under our chosen license (or keep wger as a separate optional integration).

## pdfme/pdfme
- Tech: TypeScript PDF generator + React designer, MIT license.
- Useful bits: PDF template engine that works in Node/browser. Very suitable for generating workout/meal-plan PDFs.
- Recommendation: Use `pdfme` (or its generator package `@pdfme/generator`) for web/pdf generation. For Python backend prefer `pdfme` via a Node microservice or use Python fallback (ReportLab) if we prefer single-language backend.

## mayerbalintdev/GYM-One
- Tech: PHP/MySQL gym management system; custom license.
- Features: Member management, ticketing, scheduling, payments, admin panel.
- Useful bits: Conceptual features for gym management and admin panel layouts.
- License: CUSTOM — inspect license carefully before reusing code; safer to reimplement features rather than copying.

## Mail-0/Zero
- Tech: Modern webmail stack (Next.js + Node backend + PostgreSQL), open-source.
- Useful bits: Email UX patterns, self-hosted email integration ideas, auth patterns, AI/agent integrations.
- Recommendation: For our email sending needs reuse architecture ideas; for actual email sending use well-known libraries (smtplib/nodemailer) rather than copying large blocks of Zero code.

---

## Licensing strategy (important)
- Avoid copying code from AGPL-licensed (wger) and custom-licensed repos unless you intend the entire project to be AGPL.
- Prefer code from MIT, Apache-2.0, or other permissive licenses (pdfme is MIT, GymTrim is Apache-2.0, nFit shows a license badge — verify).
- When in doubt: reimplement server-side logic (models/api) inspired by these projects under our chosen permissive license.

## Next actions
1. Identify exact LICENSE files in each repo and extract permitted components.
2. Produce an architecture sketch and API contract so we can implement a FastAPI backend and adapt UI components from permissive repos.
3. Choose PDF stack: either integrate `pdfme` (Node) as a microservice, or implement PDF generation in Python (ReportLab / WeasyPrint) — recommend `pdfme` for modern templates but use Python fallback for a single-language backend.
4. Plan Cloudflare integration (Workers/KV/D1) — we'll add a config to the workspace and show how to connect the Worker ID, KV and D1 names/IDs you provided.

(End of analysis snapshot)
