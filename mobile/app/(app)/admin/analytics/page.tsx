"use client";

import { useEffect, useState } from "react";
import { ScreenHeader } from "../../../_components/screen-header";
import { useAuth } from "../../../providers";
import { Splash } from "../../../_components/splash";

interface Demand {
  key: string;
  state: string;
  district: string;
  demand: number;
  supply: number;
}

interface Data {
  completed: number;
  direct: number;
  chain: number;
  topDemand: Demand[];
  maxDemand: number;
  unmet: (Demand & { gap: number })[];
}

export default function AnalyticsPage() {
  const { supabase } = useAuth();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: prefs }, { data: profiles }, completed, matchesByType] = await Promise.all([
        supabase.from("preferences").select("preferred_state, preferred_district"),
        supabase.from("profiles").select("current_state, current_district").eq("is_active", true),
        supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("matches").select("type"),
      ]);

      const demandMap = new Map<string, Demand>();
      const upsert = (state: string | null, district: string | null, field: "demand" | "supply") => {
        if (!state || !district) return;
        const key = `${state}||${district}`;
        const row = demandMap.get(key) ?? { key, state, district, demand: 0, supply: 0 };
        row[field] += 1;
        demandMap.set(key, row);
      };
      for (const p of prefs ?? []) upsert(p.preferred_state, p.preferred_district, "demand");
      for (const p of profiles ?? []) upsert(p.current_state, p.current_district, "supply");

      const rows = [...demandMap.values()];
      const topDemand = [...rows].sort((a, b) => b.demand - a.demand).slice(0, 8);
      const unmet = [...rows]
        .map((r) => ({ ...r, gap: r.demand - r.supply }))
        .filter((r) => r.gap > 0)
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 8);
      const types = matchesByType.data ?? [];

      if (active)
        setData({
          completed: completed.count ?? 0,
          direct: types.filter((m) => m.type === "direct").length,
          chain: types.filter((m) => m.type === "chain").length,
          topDemand,
          maxDemand: Math.max(1, ...topDemand.map((r) => r.demand)),
          unmet,
        });
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  if (!data) return <Splash />;

  return (
    <div>
      <ScreenHeader title="Analytics" />

      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <Stat value={data.completed} label="COMPLETED" tone="accent" />
        <Stat value={data.direct} label="DIRECT" />
        <Stat value={data.chain} label="CHAIN" tone="warning" />
      </div>

      <p className="mb-2.5 text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>DEMAND PER DISTRICT</p>
      {data.topDemand.length === 0 ? (
        <p className="ts-card text-sm" style={{ color: "var(--ts-muted)" }}>No preference data yet.</p>
      ) : (
        <div className="ts-card mb-5 space-y-3.5">
          {data.topDemand.map((r) => (
            <div key={r.key}>
              <div className="mb-1.5 flex justify-between text-xs" style={{ color: "var(--ts-muted)" }}>
                <span>{r.district}, {r.state}</span>
                <span>{r.demand} want · {r.supply} here</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--ts-border)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.demand / data.maxDemand) * 100}%`, background: "linear-gradient(90deg, var(--ts-accent), var(--ts-warning))" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {data.unmet.length > 0 && (
        <>
          <p className="mb-2.5 text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>UNMET DEMAND</p>
          <div className="ts-card space-y-2">
            {data.unmet.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-2 border-t pt-2 text-sm first:border-0 first:pt-0" style={{ borderColor: "var(--ts-border)" }}>
                <span style={{ color: "var(--ts-text-strong)" }}>{r.district}, {r.state}</span>
                <span className="ts-badge" style={{ background: "var(--ts-warning-soft)", color: "var(--ts-warning-strong)" }}>+{r.gap}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: "accent" | "warning" }) {
  const color = tone === "accent" ? "var(--ts-accent-strong)" : tone === "warning" ? "var(--ts-warning)" : "var(--ts-text-strong)";
  return (
    <div className="ts-card text-center">
      <p className="font-display text-xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-1 text-[9px] font-semibold tracking-[0.4px]" style={{ color: "var(--ts-faint)" }}>{label}</p>
    </div>
  );
}
