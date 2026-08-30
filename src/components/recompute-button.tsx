"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/native";
import { callFn } from "@/lib/functions";
import { createClient } from "@/lib/supabase/client";
import { Refresh } from "@/components/icons";

/** Triggers a fresh match computation for the current user. Web calls the API
 *  route; the standalone app calls the match-recompute Edge Function. `onDone`
 *  lets the mobile pages re-fetch (router.refresh() is a no-op under export).
 *  `variant="icon"` renders the compact spinning icon-button used by the
 *  mobile glass redesign instead of the default labeled button — opt-in, so
 *  every existing call site (web) is unaffected. */
export function RecomputeButton({
  onDone,
  variant = "text",
}: {
  onDone?: (message?: string) => void;
  variant?: "text" | "icon";
} = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  function refresh() {
    setMsg("");
    startTransition(async () => {
      try {
        let created = 0;
        if (isNativeApp()) {
          const data = await callFn<{ created?: number }>(createClient(), "match-recompute");
          created = data.created ?? 0;
        } else {
          const res = await fetch("/api/matches/recompute", { method: "POST" });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            setMsg(json.error ?? "Couldn't refresh.");
            return;
          }
          created = json.created ?? 0;
        }
        const doneMsg = created ? `${created} new match(es) found.` : "Up to date.";
        setMsg(doneMsg);
        router.refresh();
        onDone?.(doneMsg);
      } catch (e) {
        setMsg((e as Error).message || "Couldn't refresh.");
      }
    });
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label="Refresh matches"
        onClick={refresh}
        disabled={pending}
        className="grid h-9 w-9 flex-none place-items-center rounded-xl border transition active:scale-95 disabled:opacity-60"
        style={{ background: "var(--ts-surface)", borderColor: "var(--ts-border)", color: "var(--ts-text-strong)" }}
      >
        <Refresh className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button className="btn-secondary" onClick={refresh} disabled={pending}>
        {pending ? "Refreshing…" : "Refresh matches"}
      </button>
      {msg && <span className="text-xs text-sand-500">{msg}</span>}
    </div>
  );
}
