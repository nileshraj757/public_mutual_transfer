import { requireProfile } from "@/lib/auth";
import { ActiveToggle, DeleteAccountButton } from "@/components/account-actions";

export const metadata = { title: "Account settings — Mutual Transfer" };

export default async function SettingsPage() {
  const profile = await requireProfile("/settings");

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Account settings</h1>

      <div className="card space-y-2">
        <h2 className="font-semibold text-slate-900">Account</h2>
        <p className="text-sm text-slate-600">Signed in as <strong>{profile.contact_email}</strong></p>
        <p className="text-sm text-slate-600">
          Verification status: <span className="font-medium capitalize">{profile.verification_status}</span>
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-slate-900">Visibility</h2>
        <ActiveToggle initial={profile.is_active} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-slate-900">Your data (DPDP)</h2>
        <p className="text-sm text-slate-600">
          You can review and correct your data anytime on the Profile and Preferences pages. To exercise your right to
          erasure, delete your account below.
        </p>
      </div>

      <div className="card space-y-3 border-red-200">
        <h2 className="font-semibold text-red-700">Danger zone</h2>
        <DeleteAccountButton />
      </div>
    </div>
  );
}
