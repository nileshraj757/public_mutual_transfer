-- ── Per-user relaxed hard-match rules + Browse "related posts" support ────────
-- Hard rule keys (court_level/cadre/designation/pay_level) are otherwise a
-- GLOBAL admin setting (rules_config, src/lib/matching/rules.ts). This lets an
-- individual user opt out of specific keys for THEIR OWN candidate matches.
-- A key is only actually skipped for a pair when BOTH sides have relaxed it
-- (src/lib/matching/rules.ts / supabase/functions/_shared/matching.ts).
alter table public.profiles
  add column if not exists relaxed_rules text[] not null default '{}';

-- ── Per-kind notification mute preferences ─────────────────────────────────────
alter table public.profiles
  add column if not exists notification_prefs jsonb not null default
    '{"new_match":true,"consent":true,"message":true,"match_request":true,"system":true}'::jsonb;

-- Single enforcement point: skip the insert entirely when the recipient has
-- muted that kind, instead of touching every notify() call site.
create or replace function public.suppress_muted_notification()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  prefs jsonb;
begin
  select notification_prefs into prefs from public.profiles where id = new.profile_id;
  if prefs is not null and (prefs ->> new.kind) = 'false' then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_respect_prefs on public.notifications;
create trigger notifications_respect_prefs
  before insert on public.notifications
  for each row execute function public.suppress_muted_notification();

-- ── blocked_profiles ────────────────────────────────────────────────────────────
-- Blocking removes the blocked profile from each other's Search results
-- (browse_profiles, redefined below) and from shared match chat
-- (match_not_blocked(), used by the messages RLS policies, redefined below).
-- Only the blocker manages/sees their own block list.
create table if not exists public.blocked_profiles (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocked_profiles enable row level security;

drop policy if exists blocked_profiles_own on public.blocked_profiles;
create policy blocked_profiles_own on public.blocked_profiles for all
  using (blocker_id = auth.uid() or public.is_admin())
  with check (blocker_id = auth.uid());

create or replace function public.match_not_blocked(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.matches m, public.blocked_profiles b
    where m.id = p_match_id
      and b.blocker_id = any(m.member_profile_ids)
      and b.blocked_id = any(m.member_profile_ids)
  );
$$;
grant execute on function public.match_not_blocked(uuid) to authenticated;

-- Minimal anonymized view of the caller's own blocked list (for Settings →
-- Privacy). profiles RLS only allows reading your OWN full row, so a plain
-- join from blocked_profiles to profiles would return nulls — this mirrors
-- the browse_profiles()/get_match_member_views() pattern instead.
create or replace function public.get_blocked_profile_views()
returns table (
  blocked_id uuid,
  cadre text,
  current_state text,
  current_district text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.cadre, p.current_state, p.current_district
  from public.blocked_profiles b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid();
$$;
grant execute on function public.get_blocked_profile_views() to authenticated;

-- browse_profiles: redefined to also exclude profiles blocked either direction.
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
    and not exists (
      select 1 from public.blocked_profiles b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by p.verification_status desc, p.created_at desc
  limit greatest(1, least(page_limit, 100))
  offset greatest(0, page_offset);
$$;

-- messages: also require no block exists between any two members of the match.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using ((public.is_match_member(match_id) and public.match_all_consented(match_id) and public.match_not_blocked(match_id))
         or public.is_admin());
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (sender_profile_id = auth.uid()
              and public.is_match_member(match_id)
              and public.match_all_consented(match_id)
              and public.match_not_blocked(match_id));

-- ── Admin-curated reference lists (Cadres/Designations — "Departments" in the
-- product spec maps to this app's existing cadre concept; see rules_config's
-- own seeded label "Cadre / department / establishment must match"). Curated
-- lists only for now — the live profile/browse dropdowns keep using
-- src/lib/judiciary.ts's constants; see the plan for why. ─────────────────────
create table if not exists public.cadres (
  id         uuid primary key default gen_random_uuid(),
  label      text not null unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.designations (
  id         uuid primary key default gen_random_uuid(),
  label      text not null unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cadres enable row level security;
alter table public.designations enable row level security;

drop policy if exists cadres_admin_only on public.cadres;
create policy cadres_admin_only on public.cadres for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists designations_admin_only on public.designations;
create policy designations_admin_only on public.designations for all
  using (public.is_admin()) with check (public.is_admin());
