"use client";

import { ProfilePanel } from "@/components/profile-panel";
import { saveProfileForm } from "@/lib/profile-core";
import { callFn } from "@/lib/functions";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

export default function ProfilePage() {
  const { supabase, session, profile, refreshProfile } = useAuth();

  if (!profile || !session) return <Splash />;

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

  return (
    <ProfilePanel
      profile={profile}
      email={session.user.email ?? null}
      onSubmit={onSubmit}
      afterSave={refreshProfile}
    />
  );
}
