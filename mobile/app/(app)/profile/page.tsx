"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { PreferencesEditor } from "@/app/(app)/preferences/preferences-editor";
import { AvatarUpload } from "@/components/avatar-upload";
import { VerificationBadge } from "@/components/badges";
import { ChevronRight } from "@/components/icons";
import { saveProfileForm } from "@/lib/profile-core";
import { savePreferencesForm, type PrefInput } from "@/lib/preferences-core";
import { callFn } from "@/lib/functions";
import { isAdminEmail } from "@/lib/env";
import { ScreenHeader } from "../../_components/screen-header";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

type View = "hub" | "edit-profile" | "edit-preferences";

/**
 * Profile tab: the brief's menu hub (avatar, verified badge, summary, menu
 * list) rather than ProfilePanel's inline detail view — this is a mobile-only
 * page, so ProfilePanel (still used by the web profile page) is untouched.
 * "Edit profile" is an addition beyond the brief's mock, since real profiles
 * need editing somewhere.
 */
export default function ProfilePage() {
  const { supabase, session, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<View>("hub");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PrefInput[] | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("preferences")
      .select("preferred_state, preferred_district, rank")
      .eq("profile_id", profile.id)
      .order("rank");
    setPreferences((data ?? []).map((p) => ({ preferred_state: p.preferred_state, preferred_district: p.preferred_district })));
  }, [supabase, profile]);

  useEffect(() => {
    if (profile) setAvatarUrl(profile.avatar_url);
    loadPreferences();
  }, [profile, loadPreferences]);

  if (!profile || !session || preferences === null) return <Splash />;

  const isAdmin = Boolean(profile.is_admin) || isAdminEmail(session.user.email);

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
        /* best-effort */
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

  if (view === "edit-profile") {
    return (
      <div>
        <ScreenHeaderBack title="Edit profile" onBack={() => setView("hub")} />
        <ProfileForm
          profile={profile}
          mode="edit"
          onSubmit={onSubmit}
          afterSave={() => {
            refreshProfile();
            setView("hub");
          }}
        />
      </div>
    );
  }

  if (view === "edit-preferences") {
    return (
      <div>
        <ScreenHeaderBack title="Preferences" onBack={() => setView("hub")} />
        <PreferencesEditor initial={preferences} onSubmit={onSubmitPreferences} afterSave={loadPreferences} lockedUntil={profile.preferences_locked_until} />
      </div>
    );
  }

  const initials =
    (profile.full_name ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  const summary = [profile.cadre, profile.designation, profile.pay_level ? `Level ${profile.pay_level}` : null].filter(Boolean).join(" · ");
  const posting = [profile.current_district, profile.current_state].filter(Boolean).join(", ");

  return (
    <div>
      <div
        className="sticky top-0 z-10 -mx-5 mb-4 border-b px-5 py-4 backdrop-blur-xl [padding-top:calc(env(safe-area-inset-top)+1rem)]"
        style={{ background: "var(--ts-sticky-bg)", borderColor: "var(--ts-border)" }}
      >
        <p className="font-display text-xl font-bold tracking-[-0.3px]" style={{ color: "var(--ts-text-strong)" }}>Profile</p>
      </div>

      <div className="ts-card mb-4 text-center">
        <div className="relative mx-auto mb-3 w-fit">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-[72px] w-[72px] rounded-full object-cover" />
          ) : (
            <div
              className="grid h-[72px] w-[72px] place-items-center rounded-full text-2xl font-bold"
              style={{ background: "linear-gradient(135deg, var(--ts-accent), var(--ts-warning))", color: "var(--ts-on-accent)" }}
            >
              {initials}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1">
            <AvatarUpload userId={profile.id} onUploaded={setAvatarUrl} />
          </span>
        </div>
        <p className="text-lg font-bold" style={{ color: "var(--ts-text)" }}>{profile.full_name || "Your profile"}</p>
        <div className="mt-2 flex justify-center">
          <VerificationBadge status={profile.verification_status} />
        </div>
        {summary && <p className="mt-2.5 text-xs" style={{ color: "var(--ts-muted)" }}>{summary}</p>}
        {posting && <p className="text-xs" style={{ color: "var(--ts-muted)" }}>{posting}</p>}
      </div>

      <div className="ts-card overflow-hidden !p-0">
        <MenuRow label="Edit profile" onClick={() => setView("edit-profile")} />
        <MenuRow label="Preferences" onClick={() => setView("edit-preferences")} />
        <MenuRow label="Settings" onClick={() => router.push("/settings")} />
        <MenuRow label="Premium" onClick={() => router.push("/billing")} />
        {isAdmin && <MenuRow label="Admin tools" tone="warning" onClick={() => router.push("/admin")} />}
        <MenuRow label="Sign out" tone="danger" onClick={signOut} last />
      </div>
    </div>
  );
}

function ScreenHeaderBack({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div
      className="sticky top-0 z-20 -mx-5 mb-4 flex items-center gap-3 border-b px-5 py-3.5 backdrop-blur-xl [padding-top:calc(env(safe-area-inset-top)+0.875rem)]"
      style={{ background: "var(--ts-sticky-bg)", borderColor: "var(--ts-border)" }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="grid h-9 w-9 flex-none place-items-center rounded-xl border transition active:scale-95"
        style={{ background: "var(--ts-surface)", borderColor: "var(--ts-border)", color: "var(--ts-text-strong)" }}
      >
        <ChevronRight className="h-[18px] w-[18px] rotate-180" />
      </button>
      <h1 className="font-display text-lg font-bold" style={{ color: "var(--ts-text-strong)" }}>{title}</h1>
    </div>
  );
}

function MenuRow({ label, onClick, tone = "default", last = false }: { label: string; onClick: () => void; tone?: "default" | "warning" | "danger"; last?: boolean }) {
  const color = tone === "warning" ? "var(--ts-warning)" : tone === "danger" ? "var(--ts-danger)" : "var(--ts-text-strong)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 text-sm transition"
      style={{ borderBottom: last ? "none" : "1px solid var(--ts-border)", color }}
    >
      <span>{label}</span>
      {tone === "default" && <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--ts-faint)" }} />}
    </button>
  );
}
