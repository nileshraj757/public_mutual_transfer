"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isNativeApp } from "@/lib/native";
import { createClient } from "@/lib/supabase/client";
import { isPremiumLockedClient } from "@/lib/billing-client";
import { callFn } from "@/lib/functions";

/**
 * Search tab → "Request to connect". Sends a match_requests row to the given
 * profile (src/app/api/matches/request/route.ts on web, the
 * match-request-send Edge Function on native). If accepted, a real `matches`
 * row is created and the existing consent → chat flow unlocks from there —
 * this button never opens chat directly. Sending a request is a premium
 * feature (also enforced server-side); Browse itself stays free.
 */
export function RequestConnectButton({ profileId }: { profileId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;
      const isLocked = await isPremiumLockedClient(supabase, user.id);
      if (active) setLocked(isLocked);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function send() {
    setStatus("sending");
    setError("");
    try {
      if (isNativeApp()) {
        await callFn(createClient(), "match-request-send", { recipient_id: profileId });
      } else {
        const res = await fetch("/api/matches/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient_id: profileId }),
        });
        if (!res.ok) {
          throw new Error((await res.json().catch(() => ({})))?.error ?? "Couldn't send request.");
        }
      }
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message || "Couldn't send request.");
    }
  }

  if (status === "sent") {
    return (
      <span className="ts-badge" style={{ background: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" }}>
        Requested
      </span>
    );
  }

  if (locked) {
    return (
      <Link href="/billing" className="ts-btn-secondary block w-full text-center text-xs">
        Subscribe to send requests
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button type="button" className="ts-btn-secondary w-full py-2.5 text-xs" onClick={send} disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Request to connect"}
      </button>
      {error && <p className="text-xs" style={{ color: "var(--ts-danger)" }}>{error}</p>}
    </div>
  );
}
