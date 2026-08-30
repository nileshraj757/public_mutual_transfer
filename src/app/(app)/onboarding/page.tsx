import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { saveProfile } from "@/app/(app)/profile/actions";
import { savePreferences } from "@/app/(app)/preferences/actions";

export const metadata = { title: "Set up your profile — TransferSetu" };

export default async function OnboardingPage() {
  await requireUser("/onboarding");
  const profile = await getProfile();
  // Already onboarded → go straight to the dashboard.
  if (profile) redirect("/dashboard");

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-sand-900">Create your profile</h1>
        <p className="mt-1 text-sm text-sand-600">
          These details determine who you can swap with, including the districts you&apos;d accept a transfer to.
        </p>
      </div>
      <ProfileForm profile={null} mode="onboarding" onSubmit={saveProfile} onSubmitPreferences={savePreferences} />
    </div>
  );
}
