"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MatchStatus } from "@/lib/types";

const LABELS: Partial<Record<MatchStatus, string>> = {
  suggested: "Not interested",
  both_interested: "Decline",
  contact_shared: "End conversation",
  agreement_generated: "End conversation",
};

/**
 * Covers "Decline" / "End conversation" / "Not interested" as one status-aware
 * action rather than three near-identical buttons — the match's current status
 * already determines which of those three labels is meaningful. Direct RLS
 * update: matches_update_member already lets any member update their own
 * match's status (supabase/migrations/0001_init.sql:337-340), same as
 * ConsentPanel's consent writes — no server route needed.
 */
export function CancelMatchButton({
  matchId,
  status,
  onDone,
}: {
  matchId: string;
  status: MatchStatus;
  /** Mobile re-fetch (router.refresh() is a no-op under static export). */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const label = LABELS[status];
  if (!label) return null;

  function cancel() {
    setError("");
    startTransition(async () => {
      const { error: e } = await createClient().from("matches").update({ status: "cancelled" }).eq("id", matchId);
      if (e) {
        setError(e.message);
        return;
      }
      router.refresh();
      onDone?.();
    });
  }

  return (
    <div className="space-y-1">
      <button type="button" className="btn-secondary" onClick={cancel} disabled={pending}>
        {pending ? "Saving…" : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
