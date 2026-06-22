"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ConsentPanelProps {
  matchId: string;
  selfConsented: boolean;
  allConsented: boolean;
  consentedCount: number;
  total: number;
}

export function ConsentPanel({ matchId, selfConsented, allConsented, consentedCount, total }: ConsentPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function setConsent(consented: boolean) {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/matches/${matchId}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consented }),
      });
      if (res.ok) router.refresh();
      else setError((await res.json().catch(() => ({})))?.error ?? "Couldn't update consent.");
    });
  }

  if (allConsented) {
    return (
      <div className="card border-green-300 bg-green-50">
        <p className="text-sm font-medium text-green-800">✓ Everyone has consented.</p>
        <p className="text-sm text-green-700">Contact details are now shared below and messaging is unlocked.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900">Mutual consent</h3>
      <p className="mt-1 text-sm text-slate-600">
        Contact details are revealed only when <strong>all {total} parties</strong> opt in. So far {consentedCount} of{" "}
        {total} are interested.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        {selfConsented ? (
          <>
            <span className="badge bg-blue-100 text-blue-800">You&apos;re interested — waiting for others</span>
            <button className="btn-secondary" onClick={() => setConsent(false)} disabled={pending}>
              Withdraw interest
            </button>
          </>
        ) : (
          <button className="btn-primary" onClick={() => setConsent(true)} disabled={pending}>
            {pending ? "Saving…" : "I'm interested"}
          </button>
        )}
      </div>
    </div>
  );
}
