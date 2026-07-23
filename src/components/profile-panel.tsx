"use client";

import { useState } from "react";
import { ProfileForm } from "@/components/profile-form";
import { VerificationBadge } from "@/components/badges";
import { MapPin, Users, Mail, Phone } from "@/components/icons";
import type { ActionResult } from "@/lib/profile-core";
import type { Profile } from "@/lib/types";

interface ProfilePanelProps {
  profile: Profile;
  /** Login email — displayed read-only; it can never be changed. */
  email: string | null;
  /** Persist edits (web server action or mobile Supabase upsert). */
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  /** Re-fetch after a successful save (mobile). */
  afterSave?: () => void;
}

/**
 * The Profile tab: a clean, informative read-only summary with a photo/initials
 * badge at the top and an "Edit profile" button that swaps in the full form.
 * Email is shown but never editable.
 */
export function ProfilePanel({ profile, email, onSubmit, afterSave }: ProfilePanelProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-sand-900">Edit profile</h1>
            <p className="mt-1 text-sm text-sand-600">Keep this accurate — it drives your matches.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>

        {/* Email is fixed — shown here so users see it, but not part of the form. */}
        <div className="card mb-5 flex items-center gap-2 text-sm text-sand-600">
          <Mail className="h-4 w-4 shrink-0 text-sand-400" />
          <span className="font-medium text-sand-700">{email ?? "—"}</span>
          <span className="ml-auto text-xs text-sand-400">Email can&apos;t be changed</span>
        </div>

        <ProfileForm
          profile={profile}
          mode="edit"
          onSubmit={onSubmit}
          afterSave={() => {
            afterSave?.();
            setEditing(false);
          }}
        />
      </div>
    );
  }

  const displayEmail = email ?? profile.contact_email;
  const posting = [profile.current_district, profile.current_state].filter(Boolean).join(", ") || "—";

  return (
    <div className="space-y-5">
      {/* Header — photo badge + identity */}
      <div className="card">
        <div className="flex items-start gap-4">
          <Avatar name={profile.full_name} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold leading-tight text-sand-900">
              {profile.full_name || "Your profile"}
            </h1>
            <div className="mt-1.5">
              <VerificationBadge status={profile.verification_status} />
            </div>
            <p className="mt-2 text-sm text-sand-600">
              {[profile.designation, profile.court_level].filter(Boolean).join(" · ") || "Complete your profile"}
            </p>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-sand-500">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{posting}</span>
            </p>
          </div>
        </div>
        <button type="button" className="btn-primary mt-4 w-full sm:w-auto" onClick={() => setEditing(true)}>
          Edit profile
        </button>
      </div>

      {profile.verification_status !== "verified" && (
        <div className="card border-amber-300 bg-amber-50 text-sm text-amber-900">
          Your profile is <strong>not yet verified</strong>. You can still be matched, but you&apos;ll be clearly
          labelled as unverified to others until an administrator (or your official email domain) verifies you.
        </div>
      )}

      {/* Account & contact */}
      <Section icon={<Mail className="h-4 w-4 text-brand-600" />} title="Account & contact">
        <Row label="Email">
          <span className="break-all text-sand-700">{displayEmail || "—"}</span>
        </Row>
        <Row label="Phone">
          <span className="flex items-center gap-1.5 text-sand-700">
            {profile.phone ? (
              <>
                <Phone className="h-3.5 w-3.5 text-sand-400" />
                {profile.phone}
              </>
            ) : (
              "—"
            )}
          </span>
        </Row>
      </Section>

      {/* Posting */}
      <Section icon={<MapPin className="h-4 w-4 text-brand-600" />} title="Current posting">
        <Row label="District & state"><Val v={posting} /></Row>
        <Row label="Court level / establishment"><Val v={profile.court_level} /></Row>
        <Row label="Joining date, present post"><Val v={formatDate(profile.joining_date)} /></Row>
      </Section>

      {/* Service & cadre */}
      <Section icon={<Users className="h-4 w-4 text-brand-600" />} title="Service & cadre">
        <Row label="Service / cadre"><Val v={profile.cadre} /></Row>
        <Row label="Designation / post"><Val v={profile.designation} /></Row>
        <Row label="Grade pay"><Val v={profile.pay_level} /></Row>
        <Row label="Employee ID"><Val v={profile.employee_id_masked} /></Row>
        <Row label="Disciplinary matter pending">
          <Val v={profile.disciplinary_pending ? "Yes (self-declared)" : "No"} />
        </Row>
      </Section>
    </div>
  );
}

function Avatar({ name }: { name: string | null }) {
  const initials =
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  return (
    <div
      className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-semibold text-white shadow-warm ring-2 ring-white"
      aria-hidden
    >
      {initials}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-sand-900">
        {icon}
        {title}
      </h2>
      <dl className="divide-y divide-sand-100">{children}</dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="shrink-0 text-sand-500">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end text-right">{children}</dd>
    </div>
  );
}

function Val({ v }: { v: string | null }) {
  return <span className="text-sand-700">{v || "—"}</span>;
}

function formatDate(d: string | null): string | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(+parsed) ? d : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
