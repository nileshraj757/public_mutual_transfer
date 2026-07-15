-- Structured court taxonomy for reliable eligibility matching.
--
-- Adds court_level and repurposes the existing free-text columns to hold
-- CANONICAL values chosen from dropdowns (see src/lib/judiciary.ts):
--   court_level  = establishment type (Supreme Court, High Court, District…)
--   cadre        = service/cadre category (Judicial Officer, Ministerial…)
--   designation  = canonical post filtered by court_level + cadre
--   pay_level    = 7th CPC level (unchanged)
--
-- Existing rows keep their old free-text values in cadre/designation; those
-- profiles simply won't match on the new court_level key until the user
-- re-saves through the updated form (which is the intended behaviour — the
-- whole point is to replace un-normalisable free text).

alter table public.profiles
  add column if not exists court_level text;

-- The engine equality-checks these four attributes together.
drop index if exists public.profiles_match_attrs_idx;
create index if not exists profiles_match_attrs_idx
  on public.profiles (court_level, cadre, designation, pay_level);

-- Surface court_level as a recognised hard rule in the admin rules editor.
-- parseRules() already defaults unknown hard keys to ON, so this row is for
-- visibility/toggling rather than strictly required.
insert into public.rules_config (key, label, value, is_hard_constraint, active)
values ('court_level', 'Court level / establishment must match', null, true, true)
on conflict (key) do nothing;
