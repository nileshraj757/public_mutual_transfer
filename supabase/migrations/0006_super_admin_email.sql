-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Super-admin by email                                                        ║
-- ║                                                                             ║
-- ║ Grants admin access to a fixed allowlist of sign-in emails, in addition to  ║
-- ║ the profiles.is_admin flag. This lets the built-in super admin              ║
-- ║ (nileshraj757@gmail.com) reach the admin panel — and pass RLS on all the    ║
-- ║ admin-gated tables — even before a profile row exists or the flag is set.   ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Keep this list in sync with adminEmails() in src/lib/env.ts.
create or replace function public.is_admin_email()
returns boolean
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (
    array['nileshraj757@gmail.com']
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin_email()
      or coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_admin_email() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Backfill the flag for any existing profile owned by a super-admin email, so
-- the DB state is consistent and the admin shows up in admin-only listings.
update public.profiles p
set is_admin = true
from auth.users u
where u.id = p.id
  and lower(u.email) = 'nileshraj757@gmail.com'
  and p.is_admin is distinct from true;
