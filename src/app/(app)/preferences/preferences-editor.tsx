"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LOCATION_DATA } from "@/lib/locations";
import { savePreferences, type PrefInput } from "./actions";
import { ChevronUp, ChevronDown, XIcon, Loader } from "@/components/icons";

export function PreferencesEditor({ initial }: { initial: PrefInput[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const onboarding = params.get("onboarding") === "1";

  const [rows, setRows] = useState<PrefInput[]>(initial.length ? initial : []);
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const states = LOCATION_DATA.map((s) => s.state);
  const districts = LOCATION_DATA.find((s) => s.state === state)?.districts ?? [];

  function add() {
    if (!state || !district) return;
    if (rows.some((r) => r.preferred_state === state && r.preferred_district === district)) return;
    setRows([...rows, { preferred_state: state, preferred_district: district }]);
    setState("");
    setDistrict("");
  }

  function remove(i: number) {
    setRows(rows.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const copy = [...rows];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setRows(copy);
  }

  function save() {
    startTransition(async () => {
      const res = await savePreferences(rows);
      if (res.ok) {
        setMsg({ ok: true, text: "Preferences saved." });
        if (onboarding) {
          router.push("/dashboard");
          router.refresh();
        } else {
          router.refresh();
        }
      } else {
        setMsg({ ok: false, text: res.error ?? "Something went wrong." });
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <h2 className="font-semibold text-sand-900">Add a preferred location</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,1fr,auto] sm:items-end">
          <div>
            <label className="label">State / UT</label>
            <select className="input" value={state} onChange={(e) => { setState(e.target.value); setDistrict(""); }}>
              <option value="">Select…</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">District</label>
            <select className="input" value={district} disabled={!state} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">{state ? "Select…" : "Pick state first"}</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button type="button" className="btn-secondary" onClick={add} disabled={!state || !district}>Add</button>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-sand-900">Your preferences (highest priority first)</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-sand-500">No preferences yet. Add at least one above.</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((r, i) => (
              <li key={`${r.preferred_state}-${r.preferred_district}`} className="flex animate-fade-in-up items-center justify-between rounded-xl border border-sand-200 px-3 py-2 transition hover:border-sand-300">
                <span className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{i + 1}</span>
                  <span className="text-sm text-sand-800">{r.preferred_district}, {r.preferred_state}</span>
                </span>
                <span className="flex items-center">
                  <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-sand-500 transition hover:bg-sand-100 disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-sand-500 transition hover:bg-sand-100 disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down"><ChevronDown className="h-4 w-4" /></button>
                  <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-red-600 transition hover:bg-red-50" onClick={() => remove(i)} aria-label="Remove"><XIcon className="h-4 w-4" /></button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {msg && <p className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}

      <button type="button" className="btn-primary" onClick={save} disabled={pending || rows.length === 0}>
        {pending && <Loader className="h-4 w-4" />}
        {pending ? "Saving…" : onboarding ? "Save & see my matches" : "Save preferences"}
      </button>
    </div>
  );
}
