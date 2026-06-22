-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Mutual Transfer Facilitation Platform — initial schema + Row Level Security  ║
-- ║                                                                              ║
-- ║ Run this once against your Supabase project (SQL Editor or `supabase db`).   ║
-- ║ Then run supabase/seed.sql for reference + demo data.                        ║
-- ║                                                                              ║
-- ║ Privacy model (DPDP-aligned):                                               ║
-- ║  • profiles.id == auth.users.id, so a profile id IS the auth user id.        ║
-- ║  • A user may read ONLY their own full profile row.                          ║
-- ║  • Everyone else sees anonymized fields via the browse_profiles() RPC —      ║
-- ║    never name, employee id, email or phone.                                  ║
-- ║  • Contact details are revealed ONLY through reveal_contact(), and ONLY      ║
-- ║    after every member of a shared match has consented.                       ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

create extension if not exists "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────────
do $$ begin
  create type verification_status as enum ('pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_type as enum ('direct', 'chain');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum (
    'suggested', 'both_interested', 'contact_shared',
    'agreement_generated', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- ── locations (normalized reference table, seeded from bundled JSON) ───────────
create table if not exists public.locations (
  id        uuid primary key default gen_random_uuid(),
  state     text not null,
  district  text not null,
  unique (state, district)
);

-- ── profiles ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  full_name            text,
  -- Employee id is stored hashed/masked; raw id is never persisted or exposed.
  employee_id_hash     text,
  employee_id_masked   text,                  -- e.g. "JA••••27" for display to self/admin
  cadre                text,
  designation          text,
  pay_level            text,
  current_state        text,
  current_district     text,
  current_office       text,
  joining_date         date,
  last_transfer_date   date,
  disciplinary_pending boolean not null default false,
  verification_status  verification_status not null default 'pending',
  contact_email        text,                  -- private; revealed only after consent
  phone                text,                  -- private; revealed only after consent
  is_admin             boolean not null default false,
  is_active            boolean not null default true, -- false hides from matching/browse
  consent_dpdp         boolean not null default false, -- explicit DPDP consent at signup
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists profiles_current_loc_idx
  on public.profiles (current_state, current_district);
create index if not exists profiles_match_attrs_idx
  on public.profiles (cadre, designation, pay_level);

-- ── preferences (ranked desired locations; one profile → many rows) ───────────
create table if not exists public.preferences (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  preferred_state  text not null,
  preferred_district text not null,
  rank             int not null default 1,
  created_at       timestamptz not null default now(),
  unique (profile_id, preferred_state, preferred_district)
);
create index if not exists preferences_profile_idx on public.preferences (profile_id);
create index if not exists preferences_loc_idx on public.preferences (preferred_state, preferred_district);

-- ── rules_config (admin-editable eligibility parameters) ──────────────────────
create table if not exists public.rules_config (
  id                uuid primary key default gen_random_uuid(),
  key               text not null unique,        -- e.g. 'cadre', 'designation', 'pay_level', 'chain_max_length'
  label             text not null,
  value             text,                         -- free-form value for numeric/text rules
  is_hard_constraint boolean not null default true,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── matches (cached results; direct = 2 members, chain = N members) ───────────
create table if not exists public.matches (
  id                 uuid primary key default gen_random_uuid(),
  type               match_type not null,
  member_profile_ids uuid[] not null,            -- ordered; for chains this is the cycle order
  -- Stable signature used to de-duplicate the same match across recomputes.
  signature          text not null unique,
  status             match_status not null default 'suggested',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists matches_members_idx on public.matches using gin (member_profile_ids);

-- ── match_consents (each member opts in before any contact is revealed) ───────
create table if not exists public.match_consents (
  match_id     uuid not null references public.matches(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  consented    boolean not null default false,
  consented_at timestamptz,
  primary key (match_id, profile_id)
);

-- ── messages (simple in-app chat, unlocked after mutual consent) ──────────────
create table if not exists public.messages (
  id                uuid primary key default gen_random_uuid(),
  match_id          uuid not null references public.matches(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body              text not null check (char_length(body) between 1 and 4000),
  created_at        timestamptz not null default now()
);
create index if not exists messages_match_idx on public.messages (match_id, created_at);

-- ── notifications (in-app feed) ───────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,                  -- 'new_match' | 'consent' | 'message' | 'system'
  title       text not null,
  body        text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_profile_idx on public.notifications (profile_id, read, created_at desc);

-- ── reports (abuse / misuse moderation) ───────────────────────────────────────
create table if not exists public.reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid references public.profiles(id) on delete set null,
  reported_profile_id uuid references public.profiles(id) on delete set null,
  match_id            uuid references public.matches(id) on delete set null,
  reason              text not null,
  status              report_status not null default 'open',
  created_at          timestamptz not null default now()
);

-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Helper functions (SECURITY DEFINER → bypass RLS internally, no recursion)   ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_match_member(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id and auth.uid() = any(m.member_profile_ids)
  );
$$;

-- True only when EVERY member of the match has an explicit consented=true row.
create or replace function public.match_all_consented(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when not exists (select 1 from public.matches where id = p_match_id) then false
    else (
      select count(*) filter (where c.consented) = cardinality(m.member_profile_ids)
      from public.matches m
      left join public.match_consents c
        on c.match_id = m.id and c.profile_id = any(m.member_profile_ids)
      where m.id = p_match_id
      group by m.member_profile_ids
    )
  end;
$$;

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_matches_touch on public.matches;
create trigger trg_matches_touch before update on public.matches
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_rules_touch on public.rules_config;
create trigger trg_rules_touch before update on public.rules_config
  for each row execute function public.touch_updated_at();

-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Anonymized browse + gated contact reveal (the only cross-user reads)         ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Returns ONLY non-identifying fields. No name / employee id / email / phone.
create or replace function public.browse_profiles(
  f_state text default null,
  f_district text default null,
  f_designation text default null,
  f_pay_level text default null,
  f_cadre text default null,
  page_limit int default 50,
  page_offset int default 0
)
returns table (
  profile_id uuid,
  cadre text,
  designation text,
  pay_level text,
  current_state text,
  current_district text,
  verification_status verification_status,
  preferred jsonb
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.cadre,
    p.designation,
    p.pay_level,
    p.current_state,
    p.current_district,
    p.verification_status,
    coalesce(
      (select jsonb_agg(jsonb_build_object('state', pr.preferred_state, 'district', pr.preferred_district, 'rank', pr.rank) order by pr.rank)
       from public.preferences pr where pr.profile_id = p.id),
      '[]'::jsonb
    ) as preferred
  from public.profiles p
  where p.is_active
    and p.id <> auth.uid()                       -- don't list yourself
    and (f_state is null or p.current_state = f_state)
    and (f_district is null or p.current_district = f_district)
    and (f_designation is null or p.designation = f_designation)
    and (f_pay_level is null or p.pay_level = f_pay_level)
    and (f_cadre is null or p.cadre = f_cadre)
  order by p.verification_status desc, p.created_at desc
  limit greatest(1, least(page_limit, 100))
  offset greatest(0, page_offset);
$$;

-- Reveals contact details of the OTHER members of a match — but only when the
-- caller is a member AND every member has consented. Otherwise returns nothing.
create or replace function public.reveal_contact(p_match_id uuid)
returns table (
  profile_id uuid,
  full_name text,
  contact_email text,
  phone text,
  current_office text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.contact_email, p.phone, p.current_office
  from public.matches m
  join public.profiles p on p.id = any(m.member_profile_ids)
  where m.id = p_match_id
    and auth.uid() = any(m.member_profile_ids)   -- caller must be a member
    and p.id <> auth.uid()                        -- reveal others, not self
    and public.match_all_consented(p_match_id);   -- gate: everyone consented
$$;

-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Row Level Security                                                           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

alter table public.locations       enable row level security;
alter table public.profiles        enable row level security;
alter table public.preferences     enable row level security;
alter table public.rules_config    enable row level security;
alter table public.matches         enable row level security;
alter table public.match_consents  enable row level security;
alter table public.messages        enable row level security;
alter table public.notifications   enable row level security;
alter table public.reports         enable row level security;

-- locations: public read; only admins write.
drop policy if exists locations_read on public.locations;
create policy locations_read on public.locations for select using (true);
drop policy if exists locations_admin_write on public.locations;
create policy locations_admin_write on public.locations for all
  using (public.is_admin()) with check (public.is_admin());

-- profiles: a user reads/updates only their OWN row (cross-user reads go through
-- the anonymized RPCs above). Admins can read/update all.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert
  with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles for delete
  using (id = auth.uid() or public.is_admin());

-- preferences: owner full control; admins read.
drop policy if exists prefs_own on public.preferences;
create policy prefs_own on public.preferences for all
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid());

-- rules_config: active rules are publicly readable (needed to display/validate
-- eligibility); only admins may write.
drop policy if exists rules_read on public.rules_config;
create policy rules_read on public.rules_config for select
  using (active or public.is_admin());
drop policy if exists rules_admin_write on public.rules_config;
create policy rules_admin_write on public.rules_config for all
  using (public.is_admin()) with check (public.is_admin());

-- matches: visible to members and admins. Members may advance status of their
-- own matches; admins may do anything. (Creation happens via service role.)
drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches for select
  using (auth.uid() = any(member_profile_ids) or public.is_admin());
drop policy if exists matches_update_member on public.matches;
create policy matches_update_member on public.matches for update
  using (auth.uid() = any(member_profile_ids) or public.is_admin())
  with check (auth.uid() = any(member_profile_ids) or public.is_admin());

-- match_consents: a member may read all consent rows of matches they belong to
-- (to see whether the other side has opted in) and may write only their OWN row.
drop policy if exists consents_select on public.match_consents;
create policy consents_select on public.match_consents for select
  using (public.is_match_member(match_id) or public.is_admin());
drop policy if exists consents_upsert_own on public.match_consents;
create policy consents_insert_own on public.match_consents for insert
  with check (profile_id = auth.uid() and public.is_match_member(match_id));
create policy consents_update_own on public.match_consents for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- messages: readable/sendable only by members of the match AND only once every
-- member has consented (mutual-consent gate). Admins can read for moderation.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using ((public.is_match_member(match_id) and public.match_all_consented(match_id))
         or public.is_admin());
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (sender_profile_id = auth.uid()
              and public.is_match_member(match_id)
              and public.match_all_consented(match_id));

-- notifications: owner reads/updates own; insertion handled server-side.
drop policy if exists notifs_own on public.notifications;
create policy notifs_select_own on public.notifications for select
  using (profile_id = auth.uid() or public.is_admin());
create policy notifs_update_own on public.notifications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- reports: any authenticated user may file; reporter sees own, admins see all.
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert
  with check (reporter_profile_id = auth.uid());
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select
  using (reporter_profile_id = auth.uid() or public.is_admin());
drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports for update
  using (public.is_admin()) with check (public.is_admin());

-- Allow authenticated users to execute the gated RPCs.
grant execute on function public.browse_profiles(text, text, text, text, text, int, int) to authenticated;
grant execute on function public.reveal_contact(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_match_member(uuid) to authenticated;
grant execute on function public.match_all_consented(uuid) to authenticated;
