"use client";

import { useEffect, useState } from "react";
import { callFn } from "@/lib/functions";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

interface Stats {
  profiles: number;
  pending: number;
  matches: number;
  reports: number;
}

export default function AdminOverviewPage() {
  const { supabase } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const [profiles, pendingCount, matches, reports] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("matches").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    setStats({
      profiles: profiles.count ?? 0,
      pending: pendingCount.count ?? 0,
      matches: matches.count ?? 0,
      reports: reports.count ?? 0,
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function recompute() {
    setPending(true);
    setMsg("");
    try {
      const data = await callFn<{ created?: number }>(supabase, "match-recompute-all");
      setMsg(data.created ? `${data.created} new match(es) created.` : "Up to date — no new matches.");
      await load();
    } catch (e) {
      setMsg((e as Error).message || "Recompute failed.");
    } finally {
      setPending(false);
    }
  }

  if (!stats) return <Splash />;

  const cards = [
    { label: "Total profiles", value: stats.profiles },
    { label: "Pending verification", value: stats.pending },
    { label: "Cached matches", value: stats.matches },
    { label: "Open reports", value: stats.reports },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {cards.map((s) => (
          <div key={s.label} className="card">
            <p className="font-display text-2xl font-semibold text-sand-900">{s.value}</p>
            <p className="text-sm text-sand-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-sand-900">Recompute all matches</h2>
          <p className="text-sm text-sand-600">Rebuilds the full match graph (direct + chains) for every active profile.</p>
          {msg && <p className="mt-1 text-xs text-sand-500">{msg}</p>}
        </div>
        <button className="btn-primary" type="button" onClick={recompute} disabled={pending}>
          {pending ? "Recomputing…" : "Recompute now"}
        </button>
      </div>
    </div>
  );
}
