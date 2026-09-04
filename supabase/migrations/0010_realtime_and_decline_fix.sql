-- ── Fix "not interested" acting like a permanent block ─────────────────────────
-- Today, cancelling a match (matches.status = 'cancelled', set by
-- CancelMatchButton) doesn't actually stop messaging/contact-reveal (those only
-- ever checked consent, never status), and a pair that was ever accepted can
-- never send a fresh match_request again (see the app-layer fix in
-- src/app/api/matches/request/route.ts + supabase/functions/match-request-send).
-- This makes "not interested" a real decline instead of a de-facto block.

create or replace function public.match_is_active(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select status <> 'cancelled' from public.matches where id = p_match_id;
$$;
grant execute on function public.match_is_active(uuid) to authenticated;

-- messages: also require the match hasn't been cancelled by either member.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using ((public.is_match_member(match_id) and public.match_all_consented(match_id)
          and public.match_not_blocked(match_id) and public.match_is_active(match_id))
         or public.is_admin());
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (sender_profile_id = auth.uid()
              and public.is_match_member(match_id)
              and public.match_all_consented(match_id)
              and public.match_not_blocked(match_id)
              and public.match_is_active(match_id));

-- reveal_contact: stop revealing contact details once the match is cancelled.
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
    and public.match_all_consented(p_match_id)    -- gate: everyone consented
    and m.status <> 'cancelled';                  -- gate: not declined/ended
$$;

-- ── Realtime: let the app auto-refresh alerts, matches, requests and messages ──
-- Tables must be explicitly added to the supabase_realtime publication before
-- any postgres_changes subscription receives events for them.
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.match_requests;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
