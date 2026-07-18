"use client";

import { useCallback, useEffect, useState } from "react";
import type { RuleConfig } from "@/lib/types";
import { useAuth } from "../../../providers";
import { Splash } from "../../../_components/splash";

export default function RulesEditorPage() {
  const { supabase } = useAuth();
  const [rules, setRules] = useState<RuleConfig[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("rules_config")
      .select("*")
      .order("is_hard_constraint", { ascending: false })
      .order("key");
    setRules((data as RuleConfig[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (rules === null) return <Splash />;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-1 font-semibold text-sand-900">Eligibility rules</h2>
        <p className="text-sm text-sand-600">
          Hard constraints must be <em>equal</em> between matched employees (e.g. cadre, designation, pay level). Soft
          rules (like chain length or cooling-off) tune behaviour and display. Toggle <code>active</code> to enable/disable
          without deleting.
        </p>
      </div>

      <div className="space-y-2">
        {rules.map((r) => (
          <RuleRow key={r.id} rule={r} onChange={load} />
        ))}
      </div>

      <RuleRow onChange={load} />
    </div>
  );
}

function RuleRow({ rule, onChange }: { rule?: RuleConfig; onChange: () => void }) {
  const { supabase } = useAuth();
  const isNew = !rule;
  const [key, setKey] = useState(rule?.key ?? "");
  const [label, setLabel] = useState(rule?.label ?? "");
  const [value, setValue] = useState(rule?.value ?? "");
  const [hard, setHard] = useState(rule?.is_hard_constraint ?? true);
  const [active, setActive] = useState(rule?.active ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!key.trim() || !label.trim()) return;
    setBusy(true);
    const payload = {
      key: key.trim(),
      label: label.trim(),
      value: value.trim() || null,
      is_hard_constraint: hard,
      active,
    };
    if (rule) {
      await supabase.from("rules_config").update(payload).eq("id", rule.id);
    } else {
      await supabase.from("rules_config").upsert(payload, { onConflict: "key" });
      setKey("");
      setLabel("");
      setValue("");
    }
    setBusy(false);
    onChange();
  }

  async function remove() {
    if (!rule) return;
    setBusy(true);
    await supabase.from("rules_config").delete().eq("id", rule.id);
    setBusy(false);
    onChange();
  }

  return (
    <div className="card space-y-3">
      {isNew && <h3 className="font-semibold text-sand-900">Add a rule</h3>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Key</label>
          <input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. pay_level" />
        </div>
        <div>
          <label className="label">Label</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Description" />
        </div>
        <div>
          <label className="label">Value</label>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="(optional)" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hard} onChange={(e) => setHard(e.target.checked)} /> Hard
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
        <div className="ml-auto flex gap-2">
          <button className="btn-primary px-3 py-1.5 text-sm" type="button" onClick={save} disabled={busy}>
            {isNew ? "Add" : "Save"}
          </button>
          {rule && (
            <button className="btn-danger px-3 py-1.5 text-sm" type="button" onClick={remove} disabled={busy}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
