-- ── match_requests (Search tab "Request to connect") ──────────────────────────
-- Lets a user request a match with a specific profile found via Browse/Search,
-- instead of waiting for the algorithm (src/lib/matching/recompute.ts) to find
-- a reciprocal-preference cycle. On accept, a normal `matches` row is created
-- and the existing consent → contact-reveal → chat flow takes over unchanged.
--
-- All writes go through the service role (Edge Functions / API routes with
-- createAdminClient()) — never directly from the client — same convention as
-- `notifications` ("insertion handled server-side" below).

create table if not exists public.match_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  match_id      uuid references public.matches(id) on delete set null,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> recipient_id)
);

-- Only one pending request per direction between a given pair; re-requesting
-- after a decline/cancel is allowed since the old row is no longer 'pending'.
create unique index if not exists match_requests_pending_pair_idx
  on public.match_requests (requester_id, recipient_id)
  where (status = 'pending');

create index if not exists match_requests_recipient_idx
  on public.match_requests (recipient_id, status);

alter table public.match_requests enable row level security;

drop policy if exists match_requests_select on public.match_requests;
create policy match_requests_select on public.match_requests for select
  using (auth.uid() in (requester_id, recipient_id) or public.is_admin());

-- Notifications can now point at the request that triggered them, so the
-- Notifications feed can render inline Accept/Decline actions.
alter table public.notifications add column if not exists related_id uuid;
