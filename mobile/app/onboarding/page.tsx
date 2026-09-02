"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { saveProfileForm } from "@/lib/profile-core";
import { savePreferencesForm, type PrefInput } from "@/lib/preferences-core";
import { callFn } from "@/lib/functions";
import { useAuth } from "../providers";
import { RequireSession } from "../_components/guards";

/**
 * Step 1 of onboarding: create the profile. Requires a session but no profile
 * yet (so it can't live under the (app) RequireProfile group).
 *
 * ProfileForm (twoStep) renders profile details and preferences as two real
 * screens — only the current step is visible (the other is CSS-hidden, not
 * unmounted, so field values survive going back and forth) — but it's still
 * one <form> with one final submit that saves the profile then the
 * preference list, same as before.
 */
export default function OnboardingPage() {
  return (
    <RequireSession>
      <OnboardingInner />
    </RequireSession>
  );
}

function OnboardingInner() {
  const { supabase, session, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (profile) router.replace("/dashboard");
  }, [profile, router]);

  async function onSubmit(formData: FormData) {
    const res = await saveProfileForm(
      supabase,
      { userId: session!.user.id, userEmail: session!.user.email ?? null, autoVerified: false },
      formData
    );
    if (res.ok) {
      try {
        await callFn(supabase, "match-recompute");
      } catch {
        /* best-effort */
      }
    }
    return res;
  }

  async function onSubmitPreferences(prefs: PrefInput[]) {
    const res = await savePreferencesForm(supabase, session!.user.id, prefs);
    if (res.ok) {
      try {
        await callFn(supabase, "match-recompute");
      } catch {
        /* best-effort */
      }
    }
    return res;
  }

  return (
    <div className="pt-5">
      <ProfileForm profile={null} mode="onboarding" onSubmit={onSubmit} onSubmitPreferences={onSubmitPreferences} twoStep />
    </div>
  );
}
