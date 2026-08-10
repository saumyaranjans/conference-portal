# Conference Submission Portal

Peer-review management for an academic conference. Five interconnected
dashboards over one Postgres record, with Row Level Security doing the
access control rather than application-layer checks alone.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript, Server Actions)
- **Tailwind CSS 4**
- **Supabase** — Postgres, Auth, Storage, RLS
- **Vercel** — hosting

## The five dashboards

| Role | Route | What it does |
|---|---|---|
| Author | `/author` | Create submissions, upload papers, add co-authors, resubmit revisions, read reviews and decisions |
| Reviewer | `/reviewer` | Accept/decline invitations, score papers, write comments to author and confidential notes to editor |
| Editor | `/editor` | Triage the tracks they own, assign reviewers by workload, read all reviews, recommend an outcome |
| Editor-in-Chief | `/chief` | Ratify or override editor recommendations, assign track editors, see conference-wide progress |
| Administrator | `/admin` | Manage users and roles, configure conference and tracks, read the audit log |

A user can hold several roles at once (an editor is usually also a
reviewer); the sidebar shows a nav group per role they hold. Admins see
every group.

## How the dashboards connect

The workflow is driven by Postgres triggers, so a change made in one
dashboard shows up in the others without any polling or client
coordination:

1. Author submits → track editor is notified (`trg_submission_submitted`)
2. Editor assigns a reviewer → reviewer is notified, paper flips to
   `under_review` (`trg_assignment_created`)
3. Reviewer submits a review → assignment closes, editor is notified
   (`trg_review_submitted`)
4. Editor recommends → every Editor-in-Chief is notified
   (`trg_decision_created`, `is_final = false`)
5. Chief decides → paper status moves, author is notified
   (`trg_decision_created`, `is_final = true`)

## Access control

RLS policies are the enforcement layer. Notable rules:

- Authors see only their own submissions (plus any they are a co-author on)
- Reviewers see only submissions they are assigned to
- Editors see only submissions in tracks they own (`edits_submission()`)
- Authors read reviews **only after** they are submitted, and the
  `comments_to_editor` column is never selected on author-facing surfaces
- Paper files live in a private `papers` bucket, reachable only through
  short-lived signed URLs

`requireRole()` in `src/lib/auth.ts` guards the routes; RLS guards the
data. Both must pass.

## Setup

### 1. Supabase

Create a project, then run every file in `supabase/migrations/` in the SQL
editor, in filename order — `0001_init.sql` first, then `0002`, and so on.

The migrations create schema only; no conference or track data is seeded. Set
up the conference and its tracks from the portal once you can sign in.

### 2. Environment

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The service-role key is server-only — it is used for user administration
and the audit log, and is never sent to the browser.

### 3. Run

```bash
npm install
npm run dev
```

### 4. Make yourself the Convener

Sign up through the UI, then in the Supabase SQL editor:

```sql
update profiles
   set roles = '{author,chief,admin}'
 where email = 'you@example.com';
```

`chief` is the one that matters here: Users & Roles lives at `/chief/users`
and is Convener-only, so an `admin`-only account cannot grant roles (by
design — otherwise Editorial Office could promote itself). From there
`/chief/users` handles all further role grants.

### 5. Deploy

Push to GitHub and import the repo in Vercel. Set the same four
environment variables in the Vercel project, and update
`NEXT_PUBLIC_SITE_URL` to the deployed origin. In Supabase → Auth → URL
Configuration, add the Vercel domain to the redirect allowlist.

## Notes

- `src/proxy.ts` is the Next 16 replacement for `middleware.ts`; it
  refreshes the Supabase session cookie and gates protected routes.
- Every mutating server action writes to `audit_log`.
- Review scoring is four 1–5 dimensions plus a confidence rating; the
  average shown to editors is the mean of whichever dimensions were scored.
