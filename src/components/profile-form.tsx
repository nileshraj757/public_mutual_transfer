"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LocationSelect } from "@/components/location-select";
import { saveProfile, type ActionResult } from "@/app/(app)/profile/actions";
import type { Profile } from "@/lib/types";

interface ProfileFormProps {
  profile: Profile | null;
  mode: "onboarding" | "edit";
}

const CADRE_SUGGESTIONS = ["Subordinate Courts Establishment", "High Court Establishment", "District Judiciary"];
const DESIGNATION_SUGGESTIONS = [
  "Junior Assistant",
  "Senior Assistant",
  "Stenographer Grade III",
  "Stenographer Grade II",
  "Process Server",
  "Driver",
  "Group-D / Peon",
  "Court Clerk",
];
const PAY_LEVELS = ["Level-1", "Level-2", "Level-3", "Level-4", "Level-5", "Level-6", "Level-7"];

export function ProfileForm({ profile, mode }: ProfileFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveProfile(formData);
      setResult(res);
      if (res.ok) {
        if (mode === "onboarding") {
          router.push("/preferences?onboarding=1");
        } else {
          router.refresh();
        }
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Identity</h2>
        <div>
          <label className="label" htmlFor="full_name">Full name *</label>
          <input id="full_name" name="full_name" required className="input" defaultValue={profile?.full_name ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="employee_id">
            Employee ID {profile?.employee_id_masked ? `(stored as ${profile.employee_id_masked})` : ""}
          </label>
          <input
            id="employee_id"
            name="employee_id"
            className="input"
            placeholder={profile?.employee_id_masked ? "Leave blank to keep current" : "e.g. JA10293"}
          />
          <p className="mt-1 text-xs text-slate-500">Stored hashed/masked. Used only for verification; never shown to other users.</p>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Service details (matched on these)</h2>
        <FieldWithSuggestions name="cadre" label="Cadre / department / establishment *" defaultValue={profile?.cadre ?? ""} suggestions={CADRE_SUGGESTIONS} required />
        <FieldWithSuggestions name="designation" label="Designation / post *" defaultValue={profile?.designation ?? ""} suggestions={DESIGNATION_SUGGESTIONS} required />
        <div>
          <label className="label" htmlFor="pay_level">Pay level / grade *</label>
          <select id="pay_level" name="pay_level" required className="input" defaultValue={profile?.pay_level ?? ""}>
            <option value="">Select…</option>
            {PAY_LEVELS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Current posting</h2>
        <LocationSelect required defaultState={profile?.current_state ?? ""} defaultDistrict={profile?.current_district ?? ""} />
        <div>
          <label className="label" htmlFor="current_office">Current office (optional)</label>
          <input id="current_office" name="current_office" className="input" defaultValue={profile?.current_office ?? ""} placeholder="e.g. Patna District Court" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="joining_date">Joining date (optional)</label>
            <input id="joining_date" name="joining_date" type="date" className="input" defaultValue={profile?.joining_date ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="last_transfer_date">Last transfer date (optional)</label>
            <input id="last_transfer_date" name="last_transfer_date" type="date" className="input" defaultValue={profile?.last_transfer_date ?? ""} />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Contact &amp; declarations</h2>
        <div>
          <label className="label" htmlFor="phone">Phone (private — revealed only after mutual consent)</label>
          <input id="phone" name="phone" className="input" defaultValue={profile?.phone ?? ""} placeholder="+91 …" />
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="disciplinary_pending" defaultChecked={profile?.disciplinary_pending ?? false} className="mt-0.5" />
          <span>I have a pending disciplinary matter (self-declared; shown as a soft factor to potential matches).</span>
        </label>
      </div>

      {mode === "onboarding" && (
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <input type="checkbox" name="consent_dpdp" required className="mt-0.5" />
          <span>
            I consent to the processing of my data for the sole purpose of mutual-transfer facilitation, as described in
            the <a className="text-brand-700 underline" href="/privacy" target="_blank">Privacy Policy</a> (DPDP 2023). I can delete my data anytime.
          </span>
        </label>
      )}

      {result && !result.ok && <p className="text-sm text-red-600">{result.error}</p>}
      {result?.ok && mode === "edit" && <p className="text-sm text-green-600">Profile saved.</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : mode === "onboarding" ? "Save & add preferences" : "Save profile"}
      </button>
    </form>
  );
}

function FieldWithSuggestions({
  name,
  label,
  defaultValue,
  suggestions,
  required,
}: {
  name: string;
  label: string;
  defaultValue: string;
  suggestions: string[];
  required?: boolean;
}) {
  const listId = `${name}-list`;
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} list={listId} required={required} className="input" defaultValue={defaultValue} />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
