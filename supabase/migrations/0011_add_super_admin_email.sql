-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Add a second super-admin email                                             ║
-- ║                                                                             ║
-- ║ Extends the allowlist from 0006_super_admin_email.sql to also grant admin  ║
-- ║ access to nileshkumariitr@gmail.com, alongside the existing               ║
-- ║ nileshraj757@gmail.com.                                                    ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Keep this list in sync with SUPER_ADMIN_EMAILS in src/lib/env.ts.
create or replace function public.is_admin_email()
returns boolean
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (
    array['nileshraj757@gmail.com', 'nileshkumariitr@gmail.com']
  );
$$;

-- Backfill the flag for any existing profile owned by the new super-admin email.
update public.profiles p
set is_admin = true
from auth.users u
where u.id = p.id
  and lower(u.email) = 'nileshkumariitr@gmail.com'
  and p.is_admin is distinct from true;
