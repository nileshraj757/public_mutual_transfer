-- Allow the service_role (used by seed scripts and admin APIs) to bypass the
-- is_admin() check on tables that restrict writes to admins only.
-- service_role JWTs don't carry auth.uid(), so is_admin() returns false even
-- though the caller has full server-side privileges.

drop policy if exists locations_service_role_write on public.locations;
create policy locations_service_role_write on public.locations
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists rules_config_service_role_write on public.rules_config;
create policy rules_config_service_role_write on public.rules_config
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists profiles_service_role_write on public.profiles;
create policy profiles_service_role_write on public.profiles
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists preferences_service_role_write on public.preferences;
create policy preferences_service_role_write on public.preferences
  for all
  to service_role
  using (true)
  with check (true);
