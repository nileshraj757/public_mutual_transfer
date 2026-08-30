"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ActionResult } from "@/lib/profile-core";
import { isPreferencesLocked, type PrefInput } from "@/lib/preferences-core";
import { PreferenceRowsEditor } from "@/components/preference-rows-editor";
import { Loader } from "@/components/icons";

interface PreferencesEditorProps {
  initial: PrefInput[];
  /** Persist the list. Web passes the server action; mobile a direct upsert. */
  onSubmit: (prefs: PrefInput[]) => Promise<ActionResult>;
  /** Mobile re-fetch after save (router.refresh() is a no-op under export). */
  afterSave?: () => void;
  /** ISO timestamp — while in the future, editing is locked (anti-gaming). */
  lockedUntil?: string | null;
}

export function PreferencesEditor({ initial, onSubmit, afterSave, lockedUntil = null }: PreferencesEditorProps) {
  const router = useRouter();
  const params = useSearchParams();
  const onboarding = params.get("onboarding") === "1";

  const [rows, setRows] = useState<PrefInput[]>(initial.length ? initial : []);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (isPreferencesLocked(lockedUntil)) {
    const until = new Date(lockedUntil!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return (
      <div className="ts-card text-sm" style={{ borderColor: "var(--ts-warning-border)", color: "var(--ts-text-strong)" }}>
        <p className="font-semibold">Preferred districts are locked until {until}.</p>
        <p className="mt-1" style={{ color: "var(--ts-muted)" }}>
          To prevent fake or frequently-changing preferences, your list locks for 30 days after every save. You&apos;ll
          be able to edit it again after that date.
        </p>
        {rows.length > 0 && (
          <ol className="mt-3 space-y-1 border-t pt-3" style={{ borderColor: "var(--ts-border)" }}>
            {rows.map((r, i) => (
              <li key={`${r.preferred_state}-${r.preferred_district}`} style={{ color: "var(--ts-muted)" }}>
                {i + 1}. {r.preferred_district}, {r.preferred_state}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  function save() {
    startTransition(async () => {
      const res = await onSubmit(rows);
      if (res.ok) {
        setMsg({ ok: true, text: "Preferences saved." });
        if (onboarding) {
          router.push("/dashboard");
          router.refresh();
        } else {
          router.refresh();
        }
        afterSave?.();
      } else {
        setMsg({ ok: false, text: res.error ?? "Something went wrong." });
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed" style={{ color: "var(--ts-muted)" }}>
        Rank the districts you&apos;d swap into. This list locks for 30 days after you save, so choose carefully.
      </p>
      <PreferenceRowsEditor rows={rows} onChange={setRows} />

      {msg && <p className="text-sm" style={{ color: msg.ok ? "var(--ts-accent-strong)" : "var(--ts-danger)" }}>{msg.text}</p>}

      <button type="button" className="ts-btn-primary w-full" onClick={save} disabled={pending || rows.length === 0}>
        {pending && <Loader className="h-4 w-4" />}
        {pending ? "Saving…" : onboarding ? "Save & see my matches" : "Save preferences"}
      </button>
    </div>
  );
}
