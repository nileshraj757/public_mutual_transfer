import { createAdminClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import type { MatchCandidate, RuleConfig } from "@/lib/types";
import { parseRules } from "./rules";
import { computeAllMatches, computeMatchesForUser } from "./engine";

interface RecomputeResult {
  created: number;
  invalidated: number;
}

/** Load the matchable pool (active profiles + their preferences) and the rules. */
async function loadPoolAndRules(admin = createAdminClient()) {
  const [{ data: profiles, error: pErr }, { data: prefs, error: prefErr }, { data: rules, error: rErr }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, court_level, cadre, designation, pay_level, current_state, current_district, is_active")
        .eq("is_active", true),
      admin.from("preferences").select("profile_id, preferred_state, preferred_district, rank"),
      admin.from("rules_config").select("*"),
    ]);

  if (pErr) throw pErr;
  if (prefErr) throw prefErr;
  if (rErr) throw rErr;

  const prefsByProfile = new Map<string, { state: string; district: string; rank: number }[]>();
  for (const p of prefs ?? []) {
    const list = prefsByProfile.get(p.profile_id) ?? [];
    list.push({ state: p.preferred_state, district: p.preferred_district, rank: p.rank });
    prefsByProfile.set(p.profile_id, list);
  }

  const pool: MatchCandidate[] = (profiles ?? []).map((p) => ({
    id: p.id,
    court_level: p.court_level,
    cadre: p.cadre,
    designation: p.designation,
    pay_level: p.pay_level,
    current_state: p.current_state,
    current_district: p.current_district,
    is_active: p.is_active,
    preferences: (prefsByProfile.get(p.id) ?? [])
      .sort((a, b) => a.rank - b.rank)
      .map(({ state, district }) => ({ state, district })),
  }));

  return { pool, rules: parseRules((rules ?? []) as RuleConfig[]), admin };
}

/**
 * Recompute matches for a single user (incremental). Inserts newly discovered
 * matches, notifies members, and invalidates stale *suggested* matches that no
 * longer hold for this user. Matches that have progressed past 'suggested' are
 * preserved.
 */
export async function recomputeForUser(userId: string): Promise<RecomputeResult> {
  const { pool, rules, admin } = await loadPoolAndRules();
  const me = pool.find((c) => c.id === userId);
  if (!me) return { created: 0, invalidated: 0 };

  const discovered = computeMatchesForUser(me, pool, rules);
  const validSigs = new Set(discovered.map((d) => d.signature));

  const created = await upsertAndNotify(admin, discovered);

  // Invalidate suggested matches that involve this user but no longer hold.
  const { data: existing } = await admin
    .from("matches")
    .select("id, signature, status, member_profile_ids")
    .contains("member_profile_ids", [userId])
    .eq("status", "suggested");

  const stale = (existing ?? []).filter((m) => !validSigs.has(m.signature));
  if (stale.length) {
    await admin
      .from("matches")
      .delete()
      .in(
        "id",
        stale.map((m) => m.id)
      );
  }

  return { created, invalidated: stale.length };
}

/** Recompute the entire graph (admin/batch). Heavier; use sparingly. */
export async function recomputeAll(): Promise<RecomputeResult> {
  const { pool, rules, admin } = await loadPoolAndRules();
  const discovered = computeAllMatches(pool, rules);
  const created = await upsertAndNotify(admin, discovered);
  return { created, invalidated: 0 };
}

/** Insert only NEW matches (existing signatures untouched) and notify members. */
async function upsertAndNotify(
  admin: ReturnType<typeof createAdminClient>,
  discovered: { type: "direct" | "chain"; memberIds: string[]; signature: string }[]
): Promise<number> {
  if (!discovered.length) return 0;

  const rows = discovered.map((d) => ({
    type: d.type,
    member_profile_ids: d.memberIds,
    signature: d.signature,
    status: "suggested" as const,
  }));

  // ignoreDuplicates → ON CONFLICT DO NOTHING; .select() returns only inserts.
  const { data: inserted, error } = await admin
    .from("matches")
    .upsert(rows, { onConflict: "signature", ignoreDuplicates: true })
    .select("id, type, member_profile_ids");

  if (error) throw error;
  const newMatches = inserted ?? [];

  // Notify every member of each newly created match.
  if (newMatches.length) {
    const memberIds = [...new Set(newMatches.flatMap((m) => m.member_profile_ids))];
    const { data: contacts } = await admin
      .from("profiles")
      .select("id, contact_email")
      .in("id", memberIds);
    const emailById = new Map((contacts ?? []).map((c) => [c.id, c.contact_email]));

    await Promise.all(
      newMatches.flatMap((m) =>
        m.member_profile_ids.map((pid: string) =>
          notify({
            profileId: pid,
            kind: "new_match",
            title:
              m.type === "direct"
                ? "New direct mutual-transfer match found"
                : `New ${m.member_profile_ids.length}-way chain match found`,
            body: "Open the match to review eligibility and signal your interest.",
            link: `/matches/${m.id}`,
            email: emailById.get(pid) ?? null,
          })
        )
      )
    );
  }

  return newMatches.length;
}
