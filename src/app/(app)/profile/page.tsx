import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { VerificationBadge } from "@/components/badges";

export const metadata = { title: "Your profile — Mutual Transfer" };

export default async function ProfilePage() {
  const profile = await requireProfile("/profile");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your profile</h1>
          <p className="mt-1 text-sm text-slate-600">Keep this accurate — it drives your matches.</p>
        </div>
        <VerificationBadge status={profile.verification_status} />
      </div>

      {profile.verification_status !== "verified" && (
        <div className="card mb-5 border-amber-300 bg-amber-50 text-sm text-amber-900">
          Your profile is <strong>not yet verified</strong>. You can still be matched, but you&apos;ll be clearly
          labelled as unverified to others until an administrator (or your official email domain) verifies you.
        </div>
      )}

      <ProfileForm profile={profile} mode="edit" />

      <p className="mt-6 text-sm text-slate-600">
        Manage where you want to go on the <Link href="/preferences" className="text-brand-700 underline">Preferences</Link> page.
      </p>
    </div>
  );
}
