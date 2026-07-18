-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ get_match_member_views()                                                    ║
-- ║                                                                              ║
-- ║ Returns the ANONYMIZED profile + preference data for every co-member of the ║
-- ║ calling user's matches (including the caller). This is the one read in       ║
-- ║ src/lib/matches.ts that previously required the service-role key: RLS lets a ║
-- ║ user read only their OWN profile/preferences row, but a match view needs the ║
-- ║ (non-contact) attributes of the other members too.                           ║
-- ║                                                                              ║
-- ║ SECURITY DEFINER bypasses RLS internally, but the result is scoped to        ║
-- ║ auth.uid()'s co-members and exposes NO contact columns (no full_name,        ║
-- ║ contact_email, phone) — contact is still revealed only via reveal_contact(). ║
-- ║ This lets the browser client (mobile app) build match views RLS-safely with  ║
-- ║ no service key on the device.                                                ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

create or replace function public.get_match_member_views()
returns jsonb
language sql stable security definer set search_path = public as $$
  with comembers as (
    select distinct unnest(m.member_profile_ids) as pid
    from public.matches m
    where auth.uid() = any(m.member_profile_ids)
  )
  select jsonb_build_object(
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',                  p.id,
        'court_level',         p.court_level,
        'cadre',               p.cadre,
        'designation',         p.designation,
        'pay_level',           p.pay_level,
        'current_state',       p.current_state,
        'current_district',    p.current_district,
        'current_office',      p.current_office,
        'verification_status', p.verification_status,
        'disciplinary_pending',p.disciplinary_pending,
        'last_transfer_date',  p.last_transfer_date,
        'joining_date',        p.joining_date
      ))
      from public.profiles p
      where p.id in (select pid from comembers)
    ), '[]'::jsonb),
    'preferences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'profile_id',        pr.profile_id,
        'preferred_state',   pr.preferred_state,
        'preferred_district',pr.preferred_district,
        'rank',              pr.rank
      ))
      from public.preferences pr
      where pr.profile_id in (select pid from comembers)
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_match_member_views() to authenticated;
