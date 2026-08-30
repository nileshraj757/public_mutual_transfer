"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const KINDS: { key: string; label: string }[] = [
  { key: "new_match", label: "New matches" },
  { key: "consent", label: "Consent / interest updates" },
  { key: "message", label: "New chat messages" },
  { key: "match_request", label: "Connection requests" },
  { key: "system", label: "Account & billing" },
];

/**
 * Enforcement is centralized in a DB trigger
 * (suppress_muted_notification(), supabase/migrations/0008_relaxed_rules_and_prefs.sql)
 * so this only needs to persist the preference — every notify() call site
 * already respects it without further changes.
 */
export function NotificationPrefsPanel({
  profileId,
  initial,
}: {
  profileId: string;
  initial: Record<string, boolean>;
}) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: string) {
    const next = { ...prefs, [key]: !(prefs[key] ?? true) };
    setPrefs(next);
    setSaved(false);
    startTransition(async () => {
      await createClient().from("profiles").update({ notification_prefs: next }).eq("id", profileId);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-1">
      {KINDS.map(({ key, label }) => {
        const checked = prefs[key] ?? true;
        return (
          <div key={key} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm" style={{ color: "var(--ts-text-strong)" }}>{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              aria-label={label}
              disabled={pending}
              onClick={() => toggle(key)}
              className="relative h-[26px] w-11 flex-none rounded-full transition disabled:opacity-50"
              style={{ background: checked ? "var(--ts-accent)" : "var(--ts-border-strong)" }}
            >
              <span
                className="absolute top-[3px] h-5 w-5 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]"
                style={{ left: 3, transform: `translateX(${checked ? 18 : 0}px)` }}
              />
            </button>
          </div>
        );
      })}
      {saved && <p className="text-xs" style={{ color: "var(--ts-accent-strong)" }}>Saved.</p>}
    </div>
  );
}
