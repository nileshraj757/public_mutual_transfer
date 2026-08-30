"use client";

import { useCallback, useEffect, useState } from "react";
import { ProfilePanel } from "@/components/profile-panel";
import { saveProfileForm } from "@/lib/profile-core";
import { savePreferencesForm, type PrefInput } from "@/lib/preferences-core";
import { callFn } from "@/lib/functions";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

export default function ProfilePage() {
  const { supabase, session, profile, refreshProfile } = useAuth();
  const [preferences, setPreferences] = useState<PrefInput[] | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("preferences")
      .select("preferred_state, preferred_district, rank")
      .eq("profile_id", profile.id)
      .order("rank");
    setPreferences(
      (data ?? []).map((p) => ({
        preferred_state: p.preferred_state,
        preferred_district: p.preferred_district,
      }))
    );
  }, [supabase, profile]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  if (!profile || !session || preferences === null) return <Splash />;

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
        /* recompute best-effort */
      }
    }
    return res;
  }

  async function onSubmitPreferences(prefs: PrefInput[]) {
    const res = await savePreferencesForm(supabase, profile!.id, prefs);
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
    <ProfilePanel
      profile={profile}
      email={session.user.email ?? null}
      onSubmit={onSubmit}
      afterSave={refreshProfile}
      preferences={preferences}
      onSubmitPreferences={onSubmitPreferences}
      afterSavePreferences={loadPreferences}
    />
  );
}
