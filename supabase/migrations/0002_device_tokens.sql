-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Native push: device token registry (for FCM/APNs fan-out).                   ║
-- ║ Run after 0001_init.sql. Optional — only needed if you ship the mobile app.  ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

create table if not exists public.device_tokens (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  token       text not null,
  platform    text,                                   -- 'ios' | 'android'
  created_at  timestamptz not null default now(),
  unique (profile_id, token)
);

create index if not exists device_tokens_profile_idx on public.device_tokens (profile_id);

alter table public.device_tokens enable row level security;

-- A user manages only their own device tokens; admins may read for fan-out.
drop policy if exists device_tokens_own on public.device_tokens;
create policy device_tokens_own on public.device_tokens for all
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid());
