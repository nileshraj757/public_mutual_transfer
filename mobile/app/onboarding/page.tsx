"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { saveProfileForm } from "@/lib/profile-core";
import { savePreferencesForm, type PrefInput } from "@/lib/preferences-core";
import { callFn } from "@/lib/functions";
import { ChevronRight } from "@/components/icons";
import { useAuth } from "../providers";
import { RequireSession } from "../_components/guards";

/**
 * Step 1 of onboarding: create the profile. Requires a session but no profile
 * yet (so it can't live under the (app) RequireProfile group).
 *
 * The two-step "progress bar" chrome below is presentational only — the real
 * form underneath (ProfileForm) is a single continuous <form> with one submit
 * that saves the profile then the preference list, so native HTML5 validation
 * still runs across every field regardless of which "step" is currently
 * scrolled into view. "Continue" just scrolls to the preferences section;
 * nothing is hidden or unmounted, so no field value can be lost switching
 * steps.
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
  const [step, setStep] = useState<0 | 1>(0);

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

  function goToStep2() {
    setStep(1);
    document.getElementById("profile-form-step-2")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function goToStep1() {
    setStep(0);
    document.getElementById("profile-form-step-1")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="pt-5">
      <div className="mb-3 flex items-center gap-2.5">
        {step === 1 && (
          <button
            type="button"
            onClick={goToStep1}
            aria-label="Back"
            className="grid h-9 w-9 flex-none place-items-center rounded-xl border transition active:scale-95"
            style={{ background: "var(--ts-surface)", borderColor: "var(--ts-border)", color: "var(--ts-text-strong)" }}
          >
            <ChevronRight className="h-[18px] w-[18px] rotate-180" />
          </button>
        )}
        <div>
          <p className="text-[11px] font-bold tracking-[0.8px]" style={{ color: "var(--ts-accent)" }}>STEP {step + 1} OF 2</p>
          <p className="mt-0.5 font-display text-lg font-bold" style={{ color: "var(--ts-text-strong)" }}>
            {step === 0 ? "Create your profile" : "Set your preferences"}
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-1.5">
        <div className="h-1 flex-1 rounded-full" style={{ background: "var(--ts-accent)" }} />
        <div className="h-1 flex-1 rounded-full" style={{ background: step === 1 ? "var(--ts-accent)" : "var(--ts-border-strong)" }} />
      </div>

      <ProfileForm profile={null} mode="onboarding" onSubmit={onSubmit} onSubmitPreferences={onSubmitPreferences} />

      {step === 0 && (
        <button type="button" onClick={goToStep2} className="ts-btn-secondary mt-4 w-full">
          Continue to preferences
        </button>
      )}
    </div>
  );
}
