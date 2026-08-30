"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActiveToggle, DeleteAccountButton } from "@/components/account-actions";
import { AppUpdateButton } from "@/components/app-update-button";
import { NotificationPrefsPanel } from "@/components/notification-prefs-panel";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ChangeEmailForm } from "@/components/change-email-form";
import { BlockedUsersList } from "@/components/blocked-users-list";
import { isActiveSubscription } from "@/lib/billing-core";
import { SITE_URL } from "@/lib/env";
import { ScreenHeader } from "../../_components/screen-header";
import { SegmentedControl } from "../../_components/segmented-control";
import { ToggleSwitch } from "../../_components/toggle-switch";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("ts-theme", theme);
  } catch {
    /* private-browsing storage denial: theme just won't persist */
  }
}

const NOTIF_KEYS = ["new_match", "consent", "message", "match_request", "system"];

export default function SettingsPage() {
  const { supabase, profile, refreshProfile, signOut } = useAuth();
  const [premium, setPremium] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [hindiEnabled, setHindiEnabled] = useState(true);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    try {
      setHindiEnabled(localStorage.getItem("hoverTranslate.enabled") !== "0");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const prefs = profile?.notification_prefs ?? {};
    setPushEnabled(NOTIF_KEYS.some((k) => prefs[k] ?? true));
  }, [profile?.notification_prefs]);

  async function togglePush(next: boolean) {
    setPushEnabled(next);
    if (!profile) return;
    const prefs = Object.fromEntries(NOTIF_KEYS.map((k) => [k, next]));
    await supabase.from("profiles").update({ notification_prefs: prefs }).eq("id", profile.id);
    refreshProfile();
  }

  function toggleHindi(next: boolean) {
    setHindiEnabled(next);
    try {
      localStorage.setItem("hoverTranslate.enabled", next ? "1" : "0");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("ts-hover-translate-changed"));
  }

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

  function changeTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div>
      <ScreenHeader title="Settings" />

      <div className="ts-card mb-4 !p-0 overflow-hidden">
        <Row label="Appearance">
          <div className="w-[152px]">
            <SegmentedControl
              options={[
                { label: "Dark", value: "dark" as Theme },
                { label: "Light", value: "light" as Theme },
              ]}
              value={theme}
              onChange={changeTheme}
            />
          </div>
        </Row>
        <Row label="Push notifications">
          <ToggleSwitch checked={pushEnabled} onChange={togglePush} label="Push notifications" />
        </Row>
        <Row label="Hindi hover-translate" sub="Hold any text to see its Hindi translation" last>
          <ToggleSwitch checked={hindiEnabled} onChange={toggleHindi} label="Hindi hover-translate" />
        </Row>
      </div>

      <div className="ts-card mb-4 !p-0 overflow-hidden">
        <a href={`${SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="block px-4 py-3.5 text-sm" style={{ color: "var(--ts-text-strong)" }}>
          Privacy policy
        </a>
      </div>

      <div className="mb-4">
        <DeleteAccountButton />
      </div>

      <div className="ts-card mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ts-text-strong)" }}>
            Premium
            {premium && (
              <span className="ts-badge" style={{ background: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" }}>Active</span>
            )}
          </h2>
          <p className="mt-1 text-xs" style={{ color: "var(--ts-muted)" }}>
            {premium ? "You have an active subscription." : "Unlock your Matches, Chats, connection requests, alerts, and the joint-application PDF."}
          </p>
        </div>
        <Link href="/billing" className={premium ? "ts-btn-secondary px-4 py-2 text-xs" : "ts-btn-primary px-4 py-2 text-xs"}>
          {premium ? "Manage" : "Go Premium"}
        </Link>
      </div>

      <Section title="Visibility">
        <ActiveToggle initial={profile.is_active} onDone={refreshProfile} />
      </Section>

      <Section title="App updates">
        <AppUpdateButton />
      </Section>

      <Section title="Notifications">
        <NotificationPrefsPanel profileId={profile.id} initial={profile.notification_prefs} />
      </Section>

      <Section title="Change password">
        <ChangePasswordForm />
      </Section>

      <Section title="Change email">
        <ChangeEmailForm currentEmail={profile.contact_email} />
        <p className="mt-2 text-xs" style={{ color: "var(--ts-faint)" }}>
          Need to change your phone number? That&apos;s on your <Link href="/profile" className="underline">Profile</Link> page.
        </p>
      </Section>

      <Section title="Blocked users">
        <BlockedUsersList profileId={profile.id} />
      </Section>

      <button type="button" onClick={signOut} className="ts-btn-secondary mb-6 w-full">
        Sign out
      </button>

      <p className="pb-4 text-center text-[11px]" style={{ color: "var(--ts-faint)" }}>Transfer Setu · v1.4.0</p>
    </div>
  );
}

function Row({ label, sub, children, last }: { label: string; sub?: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5" style={{ borderBottom: last ? "none" : "1px solid var(--ts-border)" }}>
      <div>
        <p className="text-sm" style={{ color: "var(--ts-text-strong)" }}>{label}</p>
        {sub && <p className="mt-0.5 text-[11px]" style={{ color: "var(--ts-faint)" }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ts-card mb-4 space-y-3">
      <h2 className="text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>{title.toUpperCase()}</h2>
      {children}
    </div>
  );
}
