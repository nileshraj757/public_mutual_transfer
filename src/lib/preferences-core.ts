import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/profile-core";

/**
 * Browser-safe preferences save logic shared by the web server action
 * (src/app/(app)/preferences/actions.ts) and the standalone mobile app. Replaces
 * the user's full ranked preference list. Recompute is the caller's job.
 */

export interface PrefInput {
  preferred_state: string;
  preferred_district: string;
}

export async function savePreferencesForm(
  supabase: SupabaseClient,
  userId: string,
  prefs: PrefInput[]
): Promise<ActionResult> {
  const seen = new Set<string>();
  const clean = prefs
    .filter((p) => p.preferred_state && p.preferred_district)
    .filter((p) => {
      const key = `${p.preferred_state}||${p.preferred_district}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (clean.length === 0) {
    return { ok: false, error: "Add at least one preferred location." };
  }

  const { error: delErr } = await supabase.from("preferences").delete().eq("profile_id", userId);
  if (delErr) return { ok: false, error: delErr.message };

  const rows = clean.map((p, i) => ({
    profile_id: userId,
    preferred_state: p.preferred_state,
    preferred_district: p.preferred_district,
    rank: i + 1,
  }));

  const { error: insErr } = await supabase.from("preferences").insert(rows);
  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true };
}
