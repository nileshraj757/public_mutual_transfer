"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const KEYS: { key: string; label: string }[] = [
  { key: "cadre", label: "Only same Cadre" },
  { key: "designation", label: "Only same Designation" },
  { key: "pay_level", label: "Only same Pay Level" },
];

/**
 * Per-user override of the (otherwise global, admin-set) hard match rules —
 * src/lib/matching/rules.ts only skips a key when BOTH sides of a candidate
 * pair have relaxed it. Saved immediately per toggle (same idiom as
 * ActiveToggle in account-actions.tsx), not tied to the ranked-list Save button.
 */
export function RelaxedRulesPanel({ profileId, initial }: { profileId: string; initial: string[] }) {
  const [relaxed, setRelaxed] = useState<Set<string>>(new Set(initial));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: string) {
    const next = new Set(relaxed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setRelaxed(next);
    setSaved(false);
    startTransition(async () => {
      await createClient()
        .from("profiles")
        .update({ relaxed_rules: [...next] })
        .eq("id", profileId);
      setSaved(true);
    });
  }

  return (
    <div className="ts-card space-y-3">
      <div>
        <h2 className="text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>MATCHING STRICTNESS</h2>
        <p className="mt-1.5 text-sm" style={{ color: "var(--ts-muted)" }}>
          By default a swap must match on cadre, designation and pay level for both sides. Uncheck any of these to
          also see otherwise-similar matches for yourself.
        </p>
      </div>
      <div className="space-y-2">
        {KEYS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ts-text-strong)" }}>
            <input type="checkbox" checked={!relaxed.has(key)} onChange={() => toggle(key)} disabled={pending} />
            {label}
          </label>
        ))}
      </div>
      {saved && <p className="text-xs" style={{ color: "var(--ts-accent-strong)" }}>Saved.</p>}
    </div>
  );
}
