"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { officialEmailDomains } from "@/lib/env";
import { recomputeForUser } from "@/lib/matching/recompute";
import { saveProfileForm, type ActionResult } from "@/lib/profile-core";

export type { ActionResult };

/**
 * Create or update the signed-in user's profile. Used by both onboarding and the
 * profile editor. Recomputes matches afterwards (preferences may already exist).
 * The core logic is shared with the mobile app via @/lib/profile-core.
 */
export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Auto-verify by official email domain when configured; otherwise keep pending
  // for admin review (never downgrade an already-verified profile here).
  const domains = officialEmailDomains();
  const emailDomain = (user.email ?? "").split("@")[1]?.toLowerCase() ?? "";
  const autoVerified = domains.length > 0 && domains.includes(emailDomain);

  const result = await saveProfileForm(
    supabase,
    { userId: user.id, userEmail: user.email ?? null, autoVerified },
    formData
  );
  if (!result.ok) return result;

  // Refresh matches for this user (best effort).
  try {
    await recomputeForUser(user.id);
  } catch {
    /* recompute is best-effort; ignore */
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
