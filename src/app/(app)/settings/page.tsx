import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/billing";
import { ActiveToggle, DeleteAccountButton } from "@/components/account-actions";

export const metadata = { title: "Account settings — Mutual Transfer" };

export default async function SettingsPage() {
  const profile = await requireProfile("/settings");
  const premium = await hasActiveSubscription(profile.id);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Account settings</h1>

      <div className="card space-y-2">
        <h2 className="font-semibold text-slate-900">Account</h2>
        <p className="break-words text-sm text-slate-600">Signed in as <strong>{profile.contact_email}</strong></p>
        <p className="text-sm text-slate-600">
          Verification status: <span className="font-medium capitalize">{profile.verification_status}</span>
        </p>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            Premium
            {premium && <span className="badge bg-green-100 text-green-800">Active</span>}
          </h2>
          <p className="text-sm text-slate-600">
            {premium
              ? "You have an active subscription."
              : "Unlock the official joint-application PDF and priority match alerts."}
          </p>
        </div>
        <Link href="/billing" className={premium ? "btn-secondary" : "btn-primary"}>
          {premium ? "Manage" : "Go Premium"}
        </Link>
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
