// Recompute matches for the signed-in user (ported from
// src/app/api/matches/recompute/route.ts + src/lib/matching/recompute.ts).
// Loads the active pool + rules with the service role, runs the shared engine,
// inserts newly-discovered matches, notifies members, and prunes stale
// *suggested* matches that no longer hold for this user.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  computeMatchesForUser,
  parseRules,
  type MatchCandidate,
  type RuleConfig,
} from "../_shared/matching.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await authenticate(req);
  if (!ctx) return json({ error: "Not signed in." }, 401);
  const { admin, userId } = ctx;

  try {
    const { pool, rules } = await loadPoolAndRules(admin);
    const me = pool.find((c) => c.id === userId);
    if (!me) return json({ created: 0, invalidated: 0 });

    const discovered = computeMatchesForUser(me, pool, rules);
    const validSigs = new Set(discovered.map((d) => d.signature));

    const created = await upsertAndNotify(admin, discovered);

    const { data: existing } = await admin
      .from("matches")
      .select("id, signature, status, member_profile_ids")
      .contains("member_profile_ids", [userId])
      .eq("status", "suggested");

    const stale = (existing ?? []).filter(
      (m: { signature: string }) => !validSigs.has(m.signature)
    );
    if (stale.length) {
      await admin.from("matches").delete().in("id", stale.map((m: { id: string }) => m.id));
    }

    return json({ created, invalidated: stale.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

async function loadPoolAndRules(admin: SupabaseClient) {
  const [{ data: profiles }, { data: prefs }, { data: rules }] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, court_level, cadre, designation, pay_level, current_state, current_district, is_active, relaxed_rules"
      )
      .eq("is_active", true),
    admin.from("preferences").select("profile_id, preferred_state, preferred_district, rank"),
    admin.from("rules_config").select("*"),
  ]);

  const prefsByProfile = new Map<string, { state: string; district: string; rank: number }[]>();
  for (const p of prefs ?? []) {
    const list = prefsByProfile.get(p.profile_id) ?? [];
    list.push({ state: p.preferred_state, district: p.preferred_district, rank: p.rank });
    prefsByProfile.set(p.profile_id, list);
  }

  const pool: MatchCandidate[] = (profiles ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    court_level: (p.court_level as string) ?? null,
    cadre: (p.cadre as string) ?? null,
    designation: (p.designation as string) ?? null,
    pay_level: (p.pay_level as string) ?? null,
    current_state: (p.current_state as string) ?? null,
    current_district: (p.current_district as string) ?? null,
    is_active: p.is_active as boolean,
    relaxed_rules: (p.relaxed_rules as string[]) ?? [],
    preferences: (prefsByProfile.get(p.id as string) ?? [])
      .sort((a, b) => a.rank - b.rank)
      .map(({ state, district }) => ({ state, district })),
  }));

  return { pool, rules: parseRules((rules ?? []) as RuleConfig[]) };
}

async function upsertAndNotify(
  admin: SupabaseClient,
  discovered: { type: "direct" | "chain"; memberIds: string[]; signature: string }[]
): Promise<number> {
  if (!discovered.length) return 0;

  const rows = discovered.map((d) => ({
    type: d.type,
    member_profile_ids: d.memberIds,
    signature: d.signature,
    status: "suggested" as const,
  }));

  const { data: inserted, error } = await admin
    .from("matches")
    .upsert(rows, { onConflict: "signature", ignoreDuplicates: true })
    .select("id, type, member_profile_ids");
  if (error) throw error;
  const newMatches = inserted ?? [];

  if (newMatches.length) {
    const notifications = newMatches.flatMap((m: { id: string; type: string; member_profile_ids: string[] }) =>
      m.member_profile_ids.map((pid) => ({
        profile_id: pid,
        kind: "new_match",
        title:
          m.type === "direct"
            ? "New direct mutual-transfer match found"
            : `New ${m.member_profile_ids.length}-way chain match found`,
        body: "Open the match to review eligibility and signal your interest.",
        link: `/matches/${m.id}`,
      }))
    );
    await admin.from("notifications").insert(notifications);
  }

  return newMatches.length;
}
