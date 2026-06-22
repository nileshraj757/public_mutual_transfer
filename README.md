# Mutual Transfer — facilitation platform for court/judicial employees

A **$0 / free-tier-only** web app that helps court & judicial-department employees
discover and arrange **mutual transfers (posting swaps)**. It finds direct swaps
(A⇄B) and multi-way chains (A→B→C→A), verifies eligibility against a configurable
rules engine, reveals contact details only after **mutual consent**, lets matched
parties chat in-app, and generates a **pre-filled joint mutual-transfer application
PDF**.

> ⚠️ **Disclaimer:** This platform only *facilitates discovery*. It does not execute
> transfers — approval rests entirely with the competent authority.

---

## What's built (feature checklist)

- **Auth & onboarding** — password-less email magic-link sign-in (free, no SMS),
  optional password sign-in for demo accounts, profile + ranked-preferences
  onboarding wizard, official-email-domain auto-verification or admin manual
  verification, clearly-labelled unverified profiles.
- **Matching** — direct + chain (cycle-detection) engine, incremental per-user
  recompute cached in the `matches` table, dashboard feed (direct → chains), and a
  filterable anonymized **Browse** page.
- **Consent & messaging** — mutual-consent gate, gated contact reveal, in-app chat.
- **Agreement PDF** — `pdf-lib` joint application with both/all parties' details and
  the proposed swap, plus a competent-authority disclaimer.
- **Notifications** — in-app feed + best-effort free-tier email (Resend) that
  degrades gracefully when unconfigured.
- **Admin** — verification queue, rules-engine CRUD, report/moderation queue, and
  analytics (demand per district, unmet-demand heatmap, completed swaps).
- **Privacy/DPDP** — RLS-enforced data exposure, hashed/masked employee IDs,
  contact hidden until consent, "delete my account & all data", published privacy
  policy, persistent disclaimer.
- **PWA** — installable manifest + offline-shell service worker.
- **Hover-to-Hindi translation** — hover over any text/sentence/paragraph to see
  its Hindi translation in a tooltip. Uses the free, key-less MyMemory API
  (en→hi) with in-memory + `localStorage` caching to stay within the free quota;
  a corner toggle turns it on/off. Optional `NEXT_PUBLIC_MYMEMORY_EMAIL` raises
  the daily limit. No paid translation service.
- **Tests** — Vitest unit tests for the matching engine & rules.

---

## Free stack & free-tier limits

| Concern | Choice | Why / free-tier notes |
|---|---|---|
| Framework | **Next.js 14 (App Router) + React + TypeScript** | Open source. |
| Styling | **Tailwind CSS** | Open source. |
| Hosting | **Vercel free (Hobby)** | Serverless functions + static. Free for personal/non-commercial; generous limits. (Cloudflare Pages / Netlify free are drop-in alternatives.) |
| DB + Auth + Storage + RLS | **Supabase free** | 500 MB Postgres, 50K monthly active auth users, social/email auth, Row Level Security — no credit card. |
| Email (auth) | **Supabase built-in mailer** | Free; used for magic links. |
| Email (notifications, optional) | **Resend free** | 3,000 emails/mo, 100/day. Optional — app works without it. |
| PDF | **pdf-lib** | Open source, runs server-side. |
| Location data | **Bundled JSON** (`data/india-states-districts.json`) | Free, no maps/geocoding API. |

Everything else is permissively-licensed npm packages. No paid services, no
trial-credit-only APIs, no credit card required.

---

## Quick start (local)

### 1. Prerequisites
- Node.js ≥ 18.17
- A free Supabase project — sign up at <https://supabase.com> (no card).

### 2. Install
```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
```

### 3. Configure environment (`.env.local`)
From **Supabase → Project Settings → API**:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only, never exposed to the browser
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OFFICIAL_EMAIL_DOMAINS=              # optional, e.g. hcourt.gov.in
# RESEND_API_KEY=...                 # optional notification email
# NOTIFY_EMAIL_FROM="Mutual Transfer <notify@yourdomain>"
```

### 4. Create the database
In **Supabase → SQL Editor**, run **in order**:
1. `supabase/migrations/0001_init.sql`  — tables, helper functions, RLS policies.
2. `supabase/seed.sql`                   — default eligibility rules.

### 5. Seed locations + demo data
```bash
npm run seed
```
This loads all states/districts, the default rules, and ~10 demo users wired to
demonstrate **one direct match** (alpha ⇄ bravo) and **one 3-way chain**
(charlie → delta → echo → charlie). Demo accounts use password `Passw0rd!`;
`admin@example.com` is an admin.

### 6. Configure Supabase Auth redirect
In **Supabase → Authentication → URL Configuration**, add the redirect URL:
```
http://localhost:3000/auth/callback
```
(and your production URL `https://<app>.vercel.app/auth/callback` when deployed).

### 7. Run
```bash
npm run dev      # http://localhost:3000
npm test         # matching engine unit tests
npm run typecheck
npm run build
```

Sign in with `alpha@example.com` (password `Passw0rd!`) to see a direct match, or
`charlie@example.com` for the chain. Sign in as `admin@example.com` to see Admin.

---

## Deploy to Vercel (free)

1. Push this repo to GitHub.
2. Import it in Vercel (Framework preset: **Next.js**).
3. Add the same env vars from `.env.local` in **Vercel → Project → Settings →
   Environment Variables** (set `NEXT_PUBLIC_SITE_URL` to your Vercel URL).
4. Add `https://<your-app>.vercel.app/auth/callback` to Supabase Auth redirect URLs.
5. Deploy. Run the SQL migration + seed against the same Supabase project (Supabase
   is shared between local and prod).

No paid plan is required at any step.

---

## How matching works (algorithm)

Implemented as pure, unit-tested functions in `src/lib/matching/` and bridged to
the DB in `src/lib/matching/recompute.ts`.

- **Edge:** a directed edge `A→B` exists when A's preference list contains B's
  current (state, district) **and** A & B satisfy all *hard* `rules_config`
  equality checks (default: cadre, designation, pay level).
- **Direct (A⇄B):** both `A→B` and `B→A` edges exist.
- **Chain (A→B→C→A):** cycles of length 3..`chain_max_length` found by bounded DFS
  (each cycle pinned to its smallest member id to avoid duplicates), de-duplicated
  by a rotation-stable signature.
- **Browse:** anonymized, filtered, paginated query via the `browse_profiles()` RPC.
- Results are **cached** in `matches` and **incrementally recomputed** on
  profile/preference change (`recomputeForUser`), with stale *suggested* matches
  invalidated. Admins can recompute the whole graph.

Run `npm test` to exercise direct matches, 3-way chains, rule relaxation, max-length
limits, and signature stability.

---

## Privacy & security model

- **RLS on every table.** Cross-user reads are impossible except through two
  `SECURITY DEFINER` RPCs:
  - `browse_profiles()` returns only **non-identifying** fields (cadre,
    designation, pay level, current district, preferred districts, verification
    status) — never name, employee ID, email or phone.
  - `reveal_contact(match_id)` returns contact details of *other* members **only**
    when the caller is a member **and every member has consented**.
- **Messaging** is readable/sendable only by members of a fully-consented match
  (RLS), and sends are rate-limited.
- **Employee IDs** are stored hashed (SHA-256) + masked; the raw value is never
  persisted readably or exposed.
- **DPDP 2023:** explicit consent at signup, purpose limitation, published privacy
  policy, and a working **"delete my account and all my data"** (removes profile,
  preferences, matches, consents, messages, notifications, and the auth user).
- **Rate limiting** on auth (Supabase built-in) + messaging/consent/reports
  (in-app best-effort limiter) to deter scraping/abuse.

You can verify anonymization at the API/RLS layer: call `browse_profiles` or select
`profiles` as a non-owner — name/email/phone never come back.

---

## Project structure

```
data/                         Bundled India states/districts JSON
supabase/
  migrations/0001_init.sql    Schema, helper fns, RLS policies
  seed.sql                    Default eligibility rules
scripts/seed.mjs              Locations + demo users/profiles/preferences seeder
src/
  app/
    (public)/                 Landing, how-it-works, privacy, sign-in
    (app)/                    Authenticated: dashboard, browse, profile,
                              preferences, matches/[id], notifications, settings,
                              onboarding, admin/*
    api/                      Route handlers (recompute, consent, messages,
                              agreement PDF, reports, account active/delete)
    auth/callback/route.ts    Magic-link code exchange
  components/                 UI (forms, match cards, chat, badges, PWA, …)
  lib/
    matching/                 rules.ts, engine.ts (pure), recompute.ts (DB bridge)
    pdf/agreement.ts          Joint-application PDF (pdf-lib)
    supabase/                 client.ts, server.ts (+ admin)
    auth.ts, matches.ts, notify.ts, rate-limit.ts, locations.ts, types.ts
tests/matching.test.ts        Vitest unit tests for the engine
public/                       PWA manifest, service worker, offline page, icon
```

---

## Stated assumptions

- **Jurisdiction is India**; default domain is subordinate-court establishments.
- **Email-based verification only** — SMS/phone OTP is intentionally omitted to
  stay 100% free. Verification is either by configured official email domain or by
  admin manual review of a self-declared employee ID.
- **Eligibility defaults** (hard equality on cadre, designation, pay level) are
  seeded but fully **admin-editable** via the rules engine.
- The **district dataset is representative** (all states/UTs with a solid district
  set); extend `data/india-states-districts.json` and re-run `npm run seed` for
  exhaustive coverage.
- Realtime chat uses **polling** (every 5s) rather than Supabase Realtime, so no
  extra configuration is needed on the free tier.
- Notification email is **optional**; without `RESEND_API_KEY` the app relies on
  in-app notifications + Supabase's built-in auth emails.
- The in-memory rate limiter is a **best-effort deterrent** (serverless instances
  don't share memory); pair with a shared store for strict global limits.
- The first user you want as admin: set `is_admin = true` on their `profiles` row
  (the seeder does this for `admin@example.com`).

---

## License

MIT (application code). Bundled data and dependencies retain their own licenses.
