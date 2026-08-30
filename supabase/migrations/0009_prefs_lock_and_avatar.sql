-- ── Preference lock (anti-gaming) + profile picture ────────────────────────────

-- Preferred districts are collected once at profile creation and re-lock for
-- 30 days on every save, to stop users from constantly re-rolling their
-- preferences. null = never locked (or lock has been cleared).
alter table public.profiles
  add column if not exists preferences_locked_until timestamptz;

-- Profile picture: a public URL into the 'avatars' Storage bucket below.
alter table public.profiles
  add column if not exists avatar_url text;

-- ── Storage bucket for profile photos ──────────────────────────────────────────
-- Public bucket (profile photos aren't sensitive PII on their own and aren't
-- surfaced anywhere except the owner's own Profile tab in this app). Objects are
-- keyed by "<user id>/<filename>" so a user can only ever write inside their own
-- folder — enforced by the RLS policies below via storage.foldername().
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_owner_write on storage.objects;
create policy avatars_owner_write on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
