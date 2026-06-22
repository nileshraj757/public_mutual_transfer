import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";

export const metadata = { title: "Set up your profile — Mutual Transfer" };

export default async function OnboardingPage() {
  await requireUser("/onboarding");
  const profile = await getProfile();
  // Already onboarded → go straight to preferences/dashboard.
  if (profile) redirect("/dashboard");

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-brand-700">Step 1 of 2</p>
        <h1 className="text-2xl font-bold text-slate-900">Create your profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          These details determine who you can swap with. Next, you&apos;ll add the locations you want.
        </p>
      </div>
      <ProfileForm profile={null} mode="onboarding" />
    </div>
  );
}
