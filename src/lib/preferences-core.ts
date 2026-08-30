import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/profile-core";

/**
 * Browser-safe preferences save logic shared by the web server action
 * (src/app/(app)/preferences/actions.ts) and the standalone mobile app. Replaces
 * the user's full ranked preference list. Recompute is the caller's job.
 *
 * Anti-gaming lock: every successful save re-locks editing for
 * LOCK_DAYS days (profiles.preferences_locked_until). The very first save
 * (locked_until is null) always goes through — the lock only kicks in once a
 * list exists. skipLockCheck lets the onboarding flow's first save bypass the
 * (redundant, since it's null anyway) lookup.
 */

export const PREFERENCES_LOCK_DAYS = 30;

export interface PrefInput {
  preferred_state: string;
  preferred_district: string;
}

/** True while editing is still locked; null/past means it's editable. */
export function isPreferencesLocked(lockedUntil: string | null): boolean {
  return Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());
}

export async function savePreferencesForm(
  supabase: SupabaseClient,
  userId: string,
  prefs: PrefInput[],
  opts: { skipLockCheck?: boolean } = {}
): Promise<ActionResult> {
  if (!opts.skipLockCheck) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("preferences_locked_until")
      .eq("id", userId)
      .maybeSingle();
    const lockedUntil = prof?.preferences_locked_until ?? null;
    if (isPreferencesLocked(lockedUntil)) {
      const until = new Date(lockedUntil!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      return {
        ok: false,
        error: `Preferred districts are locked until ${until} to prevent frequent changes. You'll be able to edit them again after that date.`,
      };
    }
  }

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

  const lockUntil = new Date(Date.now() + PREFERENCES_LOCK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("profiles").update({ preferences_locked_until: lockUntil }).eq("id", userId);

  return { ok: true };
}
