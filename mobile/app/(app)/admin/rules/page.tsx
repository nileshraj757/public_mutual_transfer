"use client";

import { useCallback, useEffect, useState } from "react";
import type { RuleConfig } from "@/lib/types";
import { ScreenHeader } from "../../../_components/screen-header";
import { ToggleSwitch } from "../../../_components/toggle-switch";
import { useAuth } from "../../../providers";
import { Splash } from "../../../_components/splash";

const HARD_KEYS = ["cadre", "designation", "pay_level", "court_level"] as const;
const HARD_LABELS: Record<string, string> = {
  cadre: "Cadre must match",
  designation: "Designation must match",
  pay_level: "Pay level must match",
  court_level: "Court level must match",
};
const CHAIN_KEY = "chain_max_length";

export default function RulesEditorPage() {
  const { supabase } = useAuth();
  const [rules, setRules] = useState<RuleConfig[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("rules_config").select("*").order("is_hard_constraint", { ascending: false }).order("key");
    setRules((data as RuleConfig[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (rules === null) return <Splash />;

  const hardRows = HARD_KEYS.map((k) => rules.find((r) => r.key === k)).filter((r): r is RuleConfig => Boolean(r));
  const chainRow = rules.find((r) => r.key === CHAIN_KEY);
  const otherRows = rules.filter((r) => !HARD_KEYS.includes(r.key as (typeof HARD_KEYS)[number]) && r.key !== CHAIN_KEY);
  const chainValue = Math.max(2, Math.min(8, parseInt(chainRow?.value ?? "5", 10) || 5));

  async function setActive(rule: RuleConfig, active: boolean) {
    setRules((cur) => cur?.map((r) => (r.id === rule.id ? { ...r, active } : r)) ?? cur);
    await supabase.from("rules_config").update({ active }).eq("id", rule.id);
  }

  async function stepChain(delta: number) {
    const next = Math.max(2, Math.min(8, chainValue + delta));
    if (chainRow) {
      setRules((cur) => cur?.map((r) => (r.id === chainRow.id ? { ...r, value: String(next) } : r)) ?? cur);
      await supabase.from("rules_config").update({ value: String(next) }).eq("id", chainRow.id);
    } else {
      await supabase.from("rules_config").upsert(
        { key: CHAIN_KEY, label: "Max chain length", value: String(next), is_hard_constraint: false, active: true },
        { onConflict: "key" }
      );
      load();
    }
  }

  return (
    <div>
      <ScreenHeader title="Eligibility rules" />

      <div className="ts-card mb-4 !p-0 overflow-hidden">
        {hardRows.map((r, i) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3.5" style={{ borderBottom: i < hardRows.length - 1 ? "1px solid var(--ts-border)" : "none" }}>
            <span className="text-sm" style={{ color: "var(--ts-text-strong)" }}>{HARD_LABELS[r.key] ?? r.label}</span>
            <ToggleSwitch checked={r.active} onChange={(v) => setActive(r, v)} label={HARD_LABELS[r.key] ?? r.label} />
          </div>
        ))}
      </div>

      <div className="ts-card mb-4">
        <p className="text-sm" style={{ color: "var(--ts-text-strong)" }}>Max chain length</p>
        <p className="mb-3 mt-0.5 text-[11px]" style={{ color: "var(--ts-faint)" }}>Longest swap cycle the matcher will search for</p>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => stepChain(-1)}
            className="grid h-9 w-9 place-items-center rounded-xl text-base font-bold"
            style={{ background: "var(--ts-surface)", color: "var(--ts-text-strong)" }}
          >
            −
          </button>
          <span className="min-w-[24px] text-center font-display text-lg font-bold" style={{ color: "var(--ts-text-strong)" }}>{chainValue}</span>
          <button
            type="button"
            onClick={() => stepChain(1)}
            className="grid h-9 w-9 place-items-center rounded-xl text-base font-bold"
            style={{ background: "var(--ts-surface)", color: "var(--ts-text-strong)" }}
          >
            +
          </button>
        </div>
      </div>

      {otherRows.length > 0 && (
        <div className="ts-card">
          <p className="mb-3 text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>OTHER RULES</p>
          <div className="space-y-2">
            {otherRows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-1.5">
                <div>
                  <p className="text-sm" style={{ color: "var(--ts-text-strong)" }}>{r.label}</p>
                  {r.value && <p className="text-[11px]" style={{ color: "var(--ts-faint)" }}>{r.value}</p>}
                </div>
                <ToggleSwitch checked={r.active} onChange={(v) => setActive(r, v)} label={r.label} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
