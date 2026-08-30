"use client";

import { useState } from "react";
import { LOCATION_DATA } from "@/lib/locations";
import type { PrefInput } from "@/lib/preferences-core";
import { ChevronUp, ChevronDown, XIcon } from "@/components/icons";

interface PreferenceRowsEditorProps {
  rows: PrefInput[];
  onChange: (rows: PrefInput[]) => void;
}

/**
 * Controlled "add + ranked list" UI for preferred districts, with no save
 * logic of its own — the parent owns `rows` and decides when/how to persist
 * them. Used standalone by PreferencesEditor (which adds its own save button)
 * and embedded directly inside ProfileForm's onboarding step.
 */
export function PreferenceRowsEditor({ rows, onChange }: PreferenceRowsEditorProps) {
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");

  const states = LOCATION_DATA.map((s) => s.state);
  const districts = LOCATION_DATA.find((s) => s.state === state)?.districts ?? [];

  function add() {
    if (!state || !district) return;
    if (rows.some((r) => r.preferred_state === state && r.preferred_district === district)) return;
    onChange([...rows, { preferred_state: state, preferred_district: district }]);
    setState("");
    setDistrict("");
  }

  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const copy = [...rows];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ts-faint)" }}>No preferences yet. Add at least one below.</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li
              key={`${r.preferred_state}-${r.preferred_district}`}
              className="flex animate-ts-card-in items-center gap-2.5 rounded-2xl border px-3.5 py-3 backdrop-blur-xl"
              style={{ background: "var(--ts-surface)", borderColor: "var(--ts-border)" }}
            >
              <span className="grid h-6 w-6 flex-none place-items-center rounded-lg text-xs font-bold" style={{ background: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" }}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm" style={{ color: "var(--ts-text-strong)" }}>{r.preferred_district}, {r.preferred_state}</span>
              <button type="button" className="grid h-[26px] w-[26px] place-items-center rounded-lg transition disabled:opacity-30" style={{ background: "var(--ts-surface-soft)", color: "var(--ts-muted)" }} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ChevronUp className="h-3.5 w-3.5" /></button>
              <button type="button" className="grid h-[26px] w-[26px] place-items-center rounded-lg transition disabled:opacity-30" style={{ background: "var(--ts-surface-soft)", color: "var(--ts-muted)" }} onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down"><ChevronDown className="h-3.5 w-3.5" /></button>
              <button type="button" className="grid h-[26px] w-[26px] place-items-center rounded-lg transition" style={{ background: "var(--ts-danger-soft)", color: "var(--ts-danger)" }} onClick={() => remove(i)} aria-label="Remove"><XIcon className="h-3 w-3" /></button>
            </li>
          ))}
        </ol>
      )}

      <div className="flex gap-2 pt-1">
        <select className="ts-input flex-1" value={state} onChange={(e) => { setState(e.target.value); setDistrict(""); }}>
          <option value="">Select state…</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="ts-input flex-1" value={district} disabled={!state} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">{state ? "Select district…" : "Pick state first"}</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!state || !district}
          className="grid w-11 flex-none place-items-center rounded-xl border transition disabled:opacity-40"
          style={{ background: "var(--ts-accent-soft)", borderColor: "var(--ts-accent-border)", color: "var(--ts-accent-strong)" }}
          aria-label="Add district"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
    </div>
  );
}
