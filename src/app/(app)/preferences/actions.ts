"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeForUser } from "@/lib/matching/recompute";
import type { ActionResult } from "@/lib/profile-core";
import { savePreferencesForm, type PrefInput } from "@/lib/preferences-core";

export type { PrefInput };

/**
 * Replace the user's full preference list (ranked by array order) and recompute
 * matches. Sent as JSON from the client editor. Core logic is shared with the
 * mobile app via @/lib/preferences-core.
 */
export async function savePreferences(prefs: PrefInput[]): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const result = await savePreferencesForm(supabase, user.id, prefs);
  if (!result.ok) return result;

  try {
    await recomputeForUser(user.id);
  } catch {
    /* best-effort */
  }

  revalidatePath("/preferences");
  revalidatePath("/dashboard");
  return { ok: true };
}
