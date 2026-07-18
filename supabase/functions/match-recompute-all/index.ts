// Recompute the ENTIRE match graph (admin-only). Mobile counterpart of the web
// admin panel's triggerRecomputeAll (src/app/(app)/admin/actions.ts ->
// recomputeAll). Verifies the caller is an admin, then runs the shared engine
// for every active profile, inserts newly-discovered matches and notifies
// members. Heavier than match-recompute — invoked only from the admin overview.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  computeMatchesForUser,
  parseRules,
  type DiscoveredMatch,
  type MatchCandidate,
  type RuleConfig,
} from "../_shared/matching.ts";

// Keep in sync with adminEmails() in src/lib/env.ts.
const ADMIN_EMAILS = ["nileshraj757@gmail.com"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await authenticate(req);
  if (!ctx) return json({ error: "Not signed in." }, 401);
  const { admin, userId, email } = ctx;

  // Authorize: allowlisted email OR the profiles.is_admin flag.
  const emailOk = !!email && ADMIN_EMAILS.includes(email.toLowerCase());
  if (!emailOk) {
    const { data: prof } = await admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (!prof?.is_admin) return json({ error: "Forbidden." }, 403);
  }

  try {
    const { pool, rules } = await loadPoolAndRules(admin);

    // Union of every user's matches, deduped by signature — equivalent to a full
    // graph rebuild using the shared per-user routine.
    const bySignature = new Map<string, DiscoveredMatch>();
    for (const me of pool) {
      for (const d of computeMatchesForUser(me, pool, rules)) {
        bySignature.set(d.signature, d);
      }
    }

    const created = await upsertAndNotify(admin, [...bySignature.values()]);
    return json({ created, invalidated: 0 });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

async function loadPoolAndRules(admin: SupabaseClient) {
  const [{ data: profiles }, { data: prefs }, { data: rules }] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, court_level, cadre, designation, pay_level, current_state, current_district, is_active"
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
