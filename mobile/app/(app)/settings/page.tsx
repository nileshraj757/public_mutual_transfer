"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActiveToggle, DeleteAccountButton } from "@/components/account-actions";
import { AppUpdateButton } from "@/components/app-update-button";
import { NotificationPrefsPanel } from "@/components/notification-prefs-panel";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ChangeEmailForm } from "@/components/change-email-form";
import { BlockedUsersList } from "@/components/blocked-users-list";
import { SignOutButton } from "@/components/sign-out-button";
import { isActiveSubscription } from "@/lib/billing-core";
import { SITE_URL } from "@/lib/env";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

export default function SettingsPage() {
  const { supabase, profile, refreshProfile } = useAuth();
  const [premium, setPremium] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) setPremium(isActiveSubscription(data));
    })();
    return () => {
      active = false;
    };
  }, [supabase, profile]);

  if (!profile) return <Splash />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-semibold text-sand-900">Account settings</h1>

      <div className="card space-y-2">
        <h2 className="font-semibold text-sand-900">Account</h2>
        <p className="break-words text-sm text-sand-600">Signed in as <strong>{profile.contact_email}</strong></p>
        <p className="text-sm text-sand-600">
          Verification status: <span className="font-medium capitalize">{profile.verification_status}</span>
        </p>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-sand-900">
            Premium
            {premium && <span className="badge bg-green-100 text-green-800">Active</span>}
          </h2>
          <p className="text-sm text-sand-600">
            {premium
              ? "You have an active subscription."
              : "Unlock your Matches, Chats, connection requests, alerts, and the joint-application PDF."}
          </p>
        </div>
        <Link href="/billing" className={premium ? "btn-secondary" : "btn-primary"}>
          {premium ? "Manage" : "Go Premium"}
        </Link>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-sand-900">Visibility</h2>
        <ActiveToggle initial={profile.is_active} onDone={refreshProfile} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-sand-900">App updates</h2>
        <AppUpdateButton />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-sand-900">Notifications</h2>
        <NotificationPrefsPanel profileId={profile.id} initial={profile.notification_prefs} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-sand-900">Change password</h2>
        <ChangePasswordForm />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-sand-900">Change email</h2>
        <ChangeEmailForm currentEmail={profile.contact_email} />
        <p className="text-xs text-sand-500">
          Need to change your phone number? That&apos;s on your <Link href="/profile" className="underline">Profile</Link> page.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-sand-900">Privacy</h2>
        <p className="text-sm text-sand-600">
          You can review and correct your data anytime on the Profile and Preferences pages. To exercise your right to
          erasure, delete your account below. Read our{" "}
          <a href={`${SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="underline">
            privacy policy
          </a>.
        </p>
        <div>
          <h3 className="mb-2 text-sm font-medium text-sand-800">Blocked users</h3>
          <BlockedUsersList profileId={profile.id} />
        </div>
      </div>

      <div className="card">
        <SignOutButton />
      </div>

      <div className="card space-y-3 border-red-200">
        <h2 className="font-semibold text-red-700">Danger zone</h2>
        <DeleteAccountButton />
      </div>
    </div>
  );
}
