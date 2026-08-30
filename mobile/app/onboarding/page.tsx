"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { saveProfileForm } from "@/lib/profile-core";
import { savePreferencesForm, type PrefInput } from "@/lib/preferences-core";
import { callFn } from "@/lib/functions";
import { useAuth } from "../providers";
import { RequireSession } from "../_components/guards";

/** Step 1 of onboarding: create the profile. Requires a session but no profile
 *  yet (so it can't live under the (app) RequireProfile group). */
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

  // Already onboarded → straight to dashboard.
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
    <main className="mx-auto max-w-2xl px-4 py-8 [padding-top:calc(env(safe-area-inset-top)+1.5rem)]">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-sand-900">Create your profile</h1>
        <p className="mt-1 text-sm text-sand-600">
          These details determine who you can swap with, including the districts you&apos;d accept a transfer to.
        </p>
      </div>
      <ProfileForm profile={null} mode="onboarding" onSubmit={onSubmit} onSubmitPreferences={onSubmitPreferences} />
    </main>
  );
}
