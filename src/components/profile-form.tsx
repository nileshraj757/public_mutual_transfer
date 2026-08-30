"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LocationSelect } from "@/components/location-select";
import { PreferenceRowsEditor } from "@/components/preference-rows-editor";
import type { ActionResult } from "@/lib/profile-core";
import type { PrefInput } from "@/lib/preferences-core";
import { COURT_LEVELS, CADRE_CATEGORIES, GRADE_PAY_OPTIONS, designationOptions, OTHER } from "@/lib/judiciary";
import { MapPin, Users, Flag, Loader } from "@/components/icons";
import type { Profile } from "@/lib/types";

interface ProfileFormProps {
  profile: Profile | null;
  mode: "onboarding" | "edit";
  /** Persist the form. Web passes the server action; mobile passes a direct
   *  Supabase upsert. */
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  /** Onboarding only: persist the preferred-districts list collected in the
   *  same step, right after the profile itself saves successfully. */
  onSubmitPreferences?: (prefs: PrefInput[]) => Promise<ActionResult>;
  /** Called after a successful save (mobile re-fetch; router.refresh() is a
   *  no-op under static export). */
  afterSave?: () => void;
}

export function ProfileForm({ profile, mode, onSubmit, onSubmitPreferences, afterSave }: ProfileFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [prefRows, setPrefRows] = useState<PrefInput[]>([]);
  const [prefError, setPrefError] = useState("");

  const [courtLevel, setCourtLevel] = useState(profile?.court_level ?? "");
  const [cadre, setCadre] = useState(profile?.cadre ?? "");

  const designationList = useMemo(
    () => (courtLevel && cadre ? designationOptions(courtLevel, cadre) : []),
    [courtLevel, cadre]
  );

  // Seed the designation: if the stored value isn't a canonical option for the
  // current court level + cadre, treat it as an "Other" free-text entry.
  const storedDesig = profile?.designation ?? "";
  const storedIsCanonical = Boolean(storedDesig) && designationList.includes(storedDesig);
  const [designation, setDesignation] = useState(storedIsCanonical ? storedDesig : storedDesig ? OTHER : "");
  const [designationOther, setDesignationOther] = useState(storedIsCanonical ? "" : storedDesig);

  function onCourtLevelChange(v: string) {
    setCourtLevel(v);
    setDesignation("");
    setDesignationOther("");
  }
  function onCadreChange(v: string) {
    setCadre(v);
    setDesignation("");
    setDesignationOther("");
  }

  async function handleSubmit(formData: FormData) {
    if (mode === "onboarding") {
      setPrefError("");
      if (prefRows.length === 0) {
        setPrefError("Add at least one preferred district — this is how we find your matches.");
        return;
      }
    }

    setPending(true);
    const res = await onSubmit(formData);
    setResult(res);

    if (res.ok && mode === "onboarding" && onSubmitPreferences) {
      const prefRes = await onSubmitPreferences(prefRows);
      if (!prefRes.ok) {
        setPending(false);
        setPrefError(prefRes.error ?? "Couldn't save your preferences — please try again.");
        return;
      }
    }

    setPending(false);
    if (res.ok) {
      if (mode === "onboarding") {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.refresh();
      }
      afterSave?.();
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* Identity */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-sand-900">Identity</h2>
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
          <p className="mt-1 text-xs text-sand-500">Stored hashed/masked. Used only for verification; never shown to other users.</p>
        </div>
      </div>

      {/* Where you are */}
      <div className="card space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-sand-900">
          <MapPin className="h-4 w-4 text-brand-600" />
          Where you are
        </h2>
        <div>
          <label className="label" htmlFor="court_level">Court level / establishment *</label>
          <select id="court_level" name="court_level" required className="input" value={courtLevel} onChange={(e) => onCourtLevelChange(e.target.value)}>
            <option value="">Select…</option>
            {COURT_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <p className="mt-1 text-xs text-sand-500">This drives the list of designations below.</p>
        </div>
        <LocationSelect required defaultState={profile?.current_state ?? ""} defaultDistrict={profile?.current_district ?? ""} />
        <div>
          <label className="label" htmlFor="joining_date">Joining date, present post (optional)</label>
          <input id="joining_date" name="joining_date" type="date" className="input" defaultValue={profile?.joining_date ?? ""} />
        </div>
      </div>

      {/* What you are */}
      <div className="card space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-sand-900">
          <Users className="h-4 w-4 text-brand-600" />
          What you are <span className="text-xs font-normal text-sand-500">(matched on these)</span>
        </h2>

        <fieldset>
          <legend className="label">Service / cadre category *</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CADRE_CATEGORIES.map((c) => (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                  cadre === c ? "border-brand-500 bg-brand-50 text-sand-900" : "border-sand-200 text-sand-700 hover:border-sand-300"
                }`}
              >
                <input type="radio" name="cadre" value={c} required checked={cadre === c} onChange={(e) => onCadreChange(e.target.value)} className="accent-brand-600" />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="designation">Designation / post *</label>
          <select
            id="designation"
            name="designation"
            required
            className="input"
            value={designation}
            disabled={!courtLevel || !cadre}
            onChange={(e) => setDesignation(e.target.value)}
          >
            <option value="">{!courtLevel || !cadre ? "Pick court level & cadre first" : "Select…"}</option>
            {designationList.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {designation === OTHER && (
            <input
              name="designation_other"
              required
              className="input mt-2"
              placeholder="Type your exact designation"
              value={designationOther}
              onChange={(e) => setDesignationOther(e.target.value)}
            />
          )}
          <p className="mt-1 text-xs text-sand-500">Choosing from the list keeps everyone&apos;s title consistent, so matches actually line up.</p>
        </div>

        <div>
          <label className="label" htmlFor="pay_level">Grade pay *</label>
          <select id="pay_level" name="pay_level" required className="input" defaultValue={profile?.pay_level ?? ""}>
            <option value="">Select…</option>
            {GRADE_PAY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Contact & declarations */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-sand-900">Contact &amp; declarations</h2>
        <div>
          <label className="label" htmlFor="phone">Phone * (private — revealed only after mutual consent)</label>
          <input id="phone" name="phone" required className="input" defaultValue={profile?.phone ?? ""} placeholder="+91 …" />
        </div>
        <label className="flex items-start gap-2 text-sm text-sand-700">
          <input type="checkbox" name="disciplinary_pending" defaultChecked={profile?.disciplinary_pending ?? false} className="mt-0.5 accent-brand-600" />
          <span>I have a pending disciplinary matter (self-declared; shown as a soft factor to potential matches).</span>
        </label>
      </div>

      {mode === "onboarding" && (
        <div className="card space-y-3">
          <h2 className="flex items-center gap-2 font-semibold text-sand-900">
            <Flag className="h-4 w-4 text-brand-600" />
            Where do you want to go? <span className="text-xs font-normal text-sand-500">(matched on these)</span>
          </h2>
          <p className="text-xs text-sand-500">
            List the districts you&apos;d accept a transfer to, most-wanted first. This locks for 30 days once saved, so
            choose carefully.
          </p>
          <PreferenceRowsEditor rows={prefRows} onChange={setPrefRows} />
          {prefError && <p className="text-sm text-red-600">{prefError}</p>}
        </div>
      )}

      {mode === "onboarding" && (
        <label className="flex items-start gap-2 rounded-xl border border-sand-200 bg-white p-4 text-sm text-sand-700">
          <input type="checkbox" name="consent_dpdp" required className="mt-0.5 accent-brand-600" />
          <span>
            I consent to the processing of my data for the sole purpose of mutual-transfer facilitation, as described in
            the <a className="text-brand-700 underline" href="/privacy" target="_blank">Privacy Policy</a> (DPDP 2023). I can delete my data anytime.
          </span>
        </label>
      )}

      {result && !result.ok && <p className="text-sm text-red-600">{result.error}</p>}
      {result?.ok && mode === "edit" && <p className="text-sm text-green-600">Profile saved.</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending && <Loader className="h-4 w-4" />}
        {pending ? "Saving…" : mode === "onboarding" ? "Create profile" : "Save profile"}
      </button>
    </form>
  );
}
