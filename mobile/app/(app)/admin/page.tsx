"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { callFn } from "@/lib/functions";
import { Shield, Settings, Flag, BarChart, Refresh } from "@/components/icons";
import { ScreenHeader } from "../../_components/screen-header";
import { useAuth } from "../../providers";
import { useToast } from "../../_components/toast";
import { Splash } from "../../_components/splash";

interface Stats {
  pending: number;
  reports: number;
}

export default function AdminHubPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  async function load() {
    const [pendingCount, reports] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    setStats({ pending: pendingCount.count ?? 0, reports: reports.count ?? 0 });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function recompute() {
    setRecomputing(true);
    try {
      const data = await callFn<{ created?: number }>(supabase, "match-recompute-all");
      toast.show(data.created ? `${data.created} new match(es) created.` : "Up to date — no new matches.");
      load();
    } catch (e) {
      toast.show((e as Error).message || "Recompute failed.");
    } finally {
      setRecomputing(false);
    }
  }

  if (!stats) return <Splash />;

  const cards = [
    { href: "/admin/verification", label: "Verification", icon: Shield, meta: `${stats.pending} pending`, color: "var(--ts-accent)" },
    { href: "/admin/rules", label: "Rules engine", icon: Settings, meta: "Eligibility config", color: "var(--ts-accent)" },
    { href: "/admin/reports", label: "Reports", icon: Flag, meta: `${stats.reports} open`, color: "var(--ts-warning)" },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart, meta: "Demand & matches", color: "var(--ts-accent)" },
  ];

  return (
    <div>
      <ScreenHeader title="Admin" />
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <button
            key={c.href}
            type="button"
            onClick={() => router.push(c.href)}
            className="ts-card text-left transition active:scale-[0.98]"
          >
            <c.icon className="h-5 w-5" style={{ color: c.color }} />
            <p className="mt-2.5 text-sm font-semibold" style={{ color: "var(--ts-text-strong)" }}>{c.label}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--ts-muted)" }}>{c.meta}</p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={recompute}
        disabled={recomputing}
        className="ts-btn-secondary mt-4 w-full gap-2 text-xs"
      >
        <Refresh className={`h-3.5 w-3.5 ${recomputing ? "animate-spin" : ""}`} />
        {recomputing ? "Recomputing…" : "Recompute all matches"}
      </button>
    </div>
  );
}
