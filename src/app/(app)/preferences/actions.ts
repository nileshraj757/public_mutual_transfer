"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeForUser } from "@/lib/matching/recompute";
import type { ActionResult } from "@/app/(app)/profile/actions";

export interface PrefInput {
  preferred_state: string;
  preferred_district: string;
}

/**
 * Replace the user's full preference list (ranked by array order) and recompute
 * matches. Sent as JSON from the client editor.
 */
export async function savePreferences(prefs: PrefInput[]): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // De-duplicate and validate.
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

  const { error: delErr } = await supabase.from("preferences").delete().eq("profile_id", user.id);
  if (delErr) return { ok: false, error: delErr.message };

  const rows = clean.map((p, i) => ({
    profile_id: user.id,
    preferred_state: p.preferred_state,
    preferred_district: p.preferred_district,
    rank: i + 1,
  }));

  const { error: insErr } = await supabase.from("preferences").insert(rows);
  if (insErr) return { ok: false, error: insErr.message };

  try {
    await recomputeForUser(user.id);
  } catch {
    /* best-effort */
  }

  revalidatePath("/preferences");
  revalidatePath("/dashboard");
  return { ok: true };
}
