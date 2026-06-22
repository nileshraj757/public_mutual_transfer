-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Static seed data: default eligibility rules.                                 ║
-- ║                                                                              ║
-- ║ Locations and demo users/profiles are seeded by `npm run seed` (Node), which ║
-- ║ reads data/india-states-districts.json and uses the Auth admin API to create ║
-- ║ demo accounts. Run this file first, then `npm run seed`.                      ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

insert into public.rules_config (key, label, value, is_hard_constraint, active) values
  ('cadre',            'Cadre / department / establishment must match', null, true,  true),
  ('designation',      'Designation / post must match',                  null, true,  true),
  ('pay_level',        'Pay level / grade pay / pay scale must match',   null, true,  true),
  ('chain_max_length', 'Maximum chain (cyclic swap) length',            '5',  false, true),
  ('cooling_off_months','Soft-flag cooling-off period since last transfer (months)', '12', false, true),
  ('show_seniority',   'Display seniority / remaining service as a soft factor', 'true', false, true)
on conflict (key) do update
  set label = excluded.label,
      value = excluded.value,
      is_hard_constraint = excluded.is_hard_constraint,
      active = excluded.active,
      updated_at = now();
