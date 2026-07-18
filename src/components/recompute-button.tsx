"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/native";
import { callFn } from "@/lib/functions";
import { createClient } from "@/lib/supabase/client";

/** Triggers a fresh match computation for the current user. Web calls the API
 *  route; the standalone app calls the match-recompute Edge Function. `onDone`
 *  lets the mobile pages re-fetch (router.refresh() is a no-op under export). */
export function RecomputeButton({ onDone }: { onDone?: () => void } = {}) {
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
        setMsg(created ? `${created} new match(es) found.` : "Up to date.");
        router.refresh();
        onDone?.();
      } catch (e) {
        setMsg((e as Error).message || "Couldn't refresh.");
      }
    });
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
