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
    <div className="space-y-2">
      {KINDS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 text-sm text-sand-700">
          <input
            type="checkbox"
            checked={prefs[key] ?? true}
            onChange={() => toggle(key)}
            disabled={pending}
          />
          {label}
        </label>
      ))}
      {saved && <p className="text-xs text-green-600">Saved.</p>}
    </div>
  );
}
