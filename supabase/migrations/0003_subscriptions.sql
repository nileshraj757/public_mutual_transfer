-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Razorpay monthly subscriptions (premium tier).                               ║
-- ║ Run after 0001_init.sql. Premium gating only takes effect once Razorpay is   ║
-- ║ configured (keys + plan id); until then every feature stays free.            ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

do $$ begin
  create type subscription_status as enum (
    'created', 'authenticated', 'active', 'pending',
    'halted', 'cancelled', 'completed', 'expired', 'paused'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  profile_id               uuid not null references public.profiles(id) on delete cascade,
  razorpay_subscription_id text unique,
  razorpay_customer_id     text,
  plan_id                  text,
  status                   subscription_status not null default 'created',
  short_url                text,                 -- hosted Razorpay payment page
  current_start            timestamptz,
  current_end              timestamptz,          -- access valid until this time
  cancel_at_period_end     boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists subscriptions_profile_idx on public.subscriptions (profile_id, created_at desc);

drop trigger if exists trg_subscriptions_touch on public.subscriptions;
create trigger trg_subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

alter table public.subscriptions enable row level security;

-- A user reads only their own subscriptions; admins read all. All writes happen
-- server-side via the service role (subscribe/verify/cancel/webhook), which
-- bypasses RLS — so there are deliberately no user insert/update policies.
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions for select
  using (profile_id = auth.uid() or public.is_admin());

-- Whether a profile currently has premium access (active and not expired).
create or replace function public.is_premium(p_profile uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.profile_id = p_profile
      and s.status in ('active', 'authenticated')
      and (s.current_end is null or s.current_end > now())
  );
$$;

grant execute on function public.is_premium(uuid) to authenticated;
