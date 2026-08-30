"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/native";
import { createClient } from "@/lib/supabase/client";

interface ConsentPanelProps {
  matchId: string;
  selfConsented: boolean;
  allConsented: boolean;
  consentedCount: number;
  total: number;
  /** Mobile re-fetch (router.refresh() is a no-op under static export). */
  onDone?: () => void;
}

export function ConsentPanel({ matchId, selfConsented, allConsented, consentedCount, total, onDone }: ConsentPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function setConsent(consented: boolean) {
    setError("");
    startTransition(async () => {
      try {
        if (isNativeApp()) {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            setError("Not signed in.");
            return;
          }
          const { error: e } = await supabase.from("match_consents").upsert(
            {
              match_id: matchId,
              profile_id: user.id,
              consented,
              consented_at: consented ? new Date().toISOString() : null,
            },
            { onConflict: "match_id,profile_id" }
          );
          if (e) {
            setError(e.message);
            return;
          }
        } else {
          const res = await fetch(`/api/matches/${matchId}/consent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consented }),
          });
          if (!res.ok) {
            setError((await res.json().catch(() => ({})))?.error ?? "Couldn't update consent.");
            return;
          }
        }
        router.refresh();
        onDone?.();
      } catch (e) {
        setError((e as Error).message || "Couldn't update consent.");
      }
    });
  }

  if (allConsented) {
    return (
      <div className="ts-card" style={{ borderColor: "var(--ts-accent-border)", background: "var(--ts-accent-soft)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--ts-accent-strong)" }}>✓ Everyone has consented.</p>
        <p className="text-sm" style={{ color: "var(--ts-text-strong)" }}>Contact details are now shared below and messaging is unlocked.</p>
      </div>
    );
  }

  return (
    <div className="ts-card">
      <h3 className="text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>CONSENT</h3>
      <p className="mt-1.5 text-sm" style={{ color: "var(--ts-muted)" }}>
        Contact details are revealed only when <strong style={{ color: "var(--ts-text-strong)" }}>all {total} parties</strong> opt in. So far{" "}
        {consentedCount} of {total} are interested.
      </p>
      {error && <p className="mt-2 text-sm" style={{ color: "var(--ts-danger)" }}>{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {selfConsented ? (
          <>
            <span className="ts-badge" style={{ background: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" }}>
              You&apos;re interested — waiting for others
            </span>
            <button className="ts-btn-secondary px-4 py-2 text-xs" onClick={() => setConsent(false)} disabled={pending}>
              Withdraw interest
            </button>
          </>
        ) : (
          <button className="ts-btn-primary w-full" onClick={() => setConsent(true)} disabled={pending}>
            {pending ? "Saving…" : "I'm interested"}
          </button>
        )}
      </div>
    </div>
  );
}
