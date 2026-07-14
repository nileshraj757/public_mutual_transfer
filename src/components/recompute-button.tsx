"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Triggers a fresh match computation for the current user via the API. */
export function RecomputeButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  function refresh() {
    setMsg("");
    startTransition(async () => {
      const res = await fetch("/api/matches/recompute", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(json.created ? `${json.created} new match(es) found.` : "Up to date.");
        router.refresh();
      } else {
        setMsg(json.error ?? "Couldn't refresh.");
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
