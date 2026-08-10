# Session log — 2026-08-01 (reconnect)

## Goal
Reconnect to the GLOGIFT 2027 conference portal project and open the Home landing page.

## Environment reconciled
- **App root is now `C:\Users\saumy\OneDrive\Documents\Glogift2026`** (moved from the old `Sessions\conference-portal` location).
- Git repo → GitHub `saumyaranjans/conference-portal`.
- Local `main` = remote `main` = **`ea5551f`** ("Harden portal security controls") — fully in sync, nothing to push.
- Vercel CLI logged in as `saumyaranjans-6646`; project `conference-portal` under team **`glogift-submission-portal`**.
- **Domain move is DONE** — production is live at **https://glogift2027.in** (this was "agreed but not started" in older notes; it's shipped).

## Problem found
Home landing page (and every route) returned **HTTP 500** locally:
> "Your project's URL and Key are required to create a Supabase client!"

Root cause: this checkout had **no `.env.local`**, so the Supabase client couldn't initialize. Production works because env vars live on Vercel.

## Fix applied
1. Linked the folder to Vercel: `vercel link --yes --project conference-portal --scope glogift-submission-portal`.
2. Pulled production env into a gitignored `.env.local`: `vercel env pull .env.local --environment=production --yes`.
   - Populated: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`, `NEXT_PUBLIC_SITE_URL`.
3. Stopped the stale dev server (it had started before `.env.local` existed) and restarted a fresh Next.js dev server on port 3000.

## Result
- Home page renders correctly at http://localhost:3000 — hero (25–27 Feb 2027, IIM Sambalpur), 10 tracks, About/theme, objectives, attractions, nav.
- Dev server: Next.js 16.2.12 (Turbopack), reading `.env.local`, `GET / 200`.

## How to re-run env pull anytime (Vercel is source of truth)
```bash
cd "C:/Users/saumy/OneDrive/Documents/Glogift2026"
npx vercel env pull .env.local --environment=production --yes
```

## Secrets stance
- Keeping secrets in `.env.local` only (gitignored) — no extra plaintext copies. Vercel remains the source of truth.
- `.env.example` in repo lists the required var names (no values).

## Open items carried forward
- Supabase `service_role` key still unrotated (long-standing).
- ~~`demo.reviewer@aidsm.example` old seed account still present.~~ Removed 2026-08-10, along with the `verify.ed1` / `verify.ed2` / `verify.convener` `@example.test` accounts and the ICCIS seed block in `0002_views_and_seed.sql`.
- Untracked scratch in the repo: `output/`, `tmp/`, `scripts/__pycache__/`, `scripts/create_brochure_concise.py`, `scripts/create_campaign_assets.py` (marketing-asset scripts, not committed).
