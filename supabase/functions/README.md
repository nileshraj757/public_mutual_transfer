# Supabase Edge Functions — privileged backend for the mobile app

The standalone mobile app (see `../../mobile/`) talks **directly to Supabase**
(RLS) for everyday data. The operations below can't run under the caller's RLS —
they need the service-role key — so they live here as Edge Functions. The app
calls them via `callFn()` (`src/lib/functions.ts`), which attaches the signed-in
user's access token as `Authorization: Bearer <token>`; every function (except
the public webhook) verifies that token before doing any privileged work
(`_shared/auth.ts`).

> The existing web app keeps using its own `src/app/api/**` routes unchanged.
> These functions are the mobile app's backend. The logic is intentionally a
> faithful port of those routes; a later cleanup can converge them.

## Functions

| Function | Auth | Ported from |
|---|---|---|
| `account-active` | Bearer | `src/app/api/account/active/route.ts` |
| `account-delete` | Bearer | `src/app/api/account/delete/route.ts` |
| `match-recompute` | Bearer | `src/app/api/matches/recompute/route.ts` + `src/lib/matching/*` (engine copied to `_shared/matching.ts`) |
| `billing-subscribe` | Bearer | `src/app/api/billing/subscribe/route.ts` |
| `billing-verify` | Bearer | `src/app/api/billing/verify/route.ts` |
| `billing-cancel` | Bearer | `src/app/api/billing/cancel/route.ts` |
| `razorpay-webhook` | **public** (HMAC-signed) | `src/app/api/webhooks/razorpay/route.ts` |

**Deliberately NOT ported** (documented, out of scope for the mobile app):
- **Admin moderation** (`src/app/(app)/admin/actions.ts`) — admins use the web
  admin panel; the mobile app omits the admin UI.
- **Agreement PDF** (`src/app/api/matches/[id]/agreement/route.ts`) — heavier
  `pdf-lib` port; deferred. The mobile match screen omits the generate-PDF button
  for now (available on the web app).

## Secrets

Set once with the Supabase CLI (service-role URL/keys are injected automatically):

```bash
supabase secrets set \
  RAZORPAY_KEY_ID=rzp_live_xxx \
  RAZORPAY_KEY_SECRET=xxx \
  RAZORPAY_PLAN_ID=plan_xxx \
  RAZORPAY_WEBHOOK_SECRET=xxx
```

`_shared/auth.ts` also reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` — these are provided by the platform at runtime.

## Deploy

```bash
supabase functions deploy account-active
supabase functions deploy account-delete
supabase functions deploy match-recompute
supabase functions deploy billing-subscribe
supabase functions deploy billing-verify
supabase functions deploy billing-cancel
# webhook must skip JWT verification (Razorpay sends no Authorization header):
supabase functions deploy razorpay-webhook --no-verify-jwt
```

Then point the Razorpay Dashboard webhook at
`https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`.

Also apply the new migration `supabase/migrations/0005_match_member_views_rpc.sql`
(the `get_match_member_views()` RPC the mobile match views depend on).
