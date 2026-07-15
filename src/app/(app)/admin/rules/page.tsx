import { createClient } from "@/lib/supabase/server";
import type { RuleConfig } from "@/lib/types";
import { deleteRule, upsertRule } from "../actions";

export default async function RulesEditorPage() {
  const supabase = createClient();
  const { data } = await supabase.from("rules_config").select("*").order("is_hard_constraint", { ascending: false }).order("key");
  const rules = (data ?? []) as RuleConfig[];

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
          <form key={r.id} action={upsertRule} className="card grid grid-cols-1 gap-3 sm:grid-cols-[1fr,2fr,1fr,auto,auto,auto] sm:items-end">
            <input type="hidden" name="id" value={r.id} />
            <div>
              <label className="label">Key</label>
              <input name="key" className="input" defaultValue={r.key} required />
            </div>
            <div>
              <label className="label">Label</label>
              <input name="label" className="input" defaultValue={r.label} required />
            </div>
            <div>
              <label className="label">Value</label>
              <input name="value" className="input" defaultValue={r.value ?? ""} placeholder="(optional)" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_hard_constraint" defaultChecked={r.is_hard_constraint} /> Hard
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={r.active} /> Active
            </label>
            <div className="flex gap-2">
              <button className="btn-secondary px-3 py-1.5 text-sm" type="submit">Save</button>
              <button className="btn-danger px-3 py-1.5 text-sm" type="submit" formAction={deleteRule}>Delete</button>
            </div>
          </form>
        ))}
      </div>

      <div className="card">
        <h3 className="mb-3 font-semibold text-sand-900">Add a rule</h3>
        <form action={upsertRule} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,2fr,1fr,auto,auto,auto] sm:items-end">
          <div>
            <label className="label">Key</label>
            <input name="key" className="input" placeholder="e.g. pay_level" required />
          </div>
          <div>
            <label className="label">Label</label>
            <input name="label" className="input" placeholder="Human-readable description" required />
          </div>
          <div>
            <label className="label">Value</label>
            <input name="value" className="input" placeholder="(optional)" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_hard_constraint" defaultChecked /> Hard
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked /> Active
          </label>
          <button className="btn-primary px-3 py-1.5 text-sm" type="submit">Add</button>
        </form>
        <p className="mt-3 text-xs text-sand-500">
          Recognized keys: <code>court_level</code>, <code>cadre</code>, <code>designation</code>, <code>pay_level</code> (hard equality);
          <code>chain_max_length</code>, <code>cooling_off_months</code>, <code>show_seniority</code> (behaviour/display).
        </p>
      </div>
    </div>
  );
}
