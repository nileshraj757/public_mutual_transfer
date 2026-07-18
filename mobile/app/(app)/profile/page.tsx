"use client";

import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";
import { VerificationBadge } from "@/components/badges";
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-sand-900">Your profile</h1>
          <p className="mt-1 text-sm text-sand-600">Keep this accurate — it drives your matches.</p>
        </div>
        <VerificationBadge status={profile.verification_status} />
      </div>

      {profile.verification_status !== "verified" && (
        <div className="card mb-5 border-amber-300 bg-amber-50 text-sm text-amber-900">
          Your profile is <strong>not yet verified</strong>. You can still be matched, but you&apos;ll be clearly
          labelled as unverified to others until an administrator (or your official email domain) verifies you.
        </div>
      )}

      <ProfileForm profile={profile} mode="edit" onSubmit={onSubmit} afterSave={refreshProfile} />

      <p className="mt-6 text-sm text-sand-600">
        Manage where you want to go on the <Link href="/preferences" className="text-brand-700 underline">Preferences</Link> page.
      </p>
    </div>
  );
}
