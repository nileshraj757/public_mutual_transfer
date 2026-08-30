import { createClient } from "@/lib/supabase/server";
import { addDesignation, deleteDesignation } from "../actions";

export default async function DesignationsPage() {
  const supabase = createClient();
  const { data } = await supabase.from("designations").select("*").order("label");
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-1 font-semibold text-sand-900">Designations</h2>
        <p className="text-sm text-sand-600">
          A curated reference list of post/designation names. Live Profile/Search dropdowns still use{" "}
          <code>src/lib/judiciary.ts</code>&apos;s built-in list; this is for admin reference and future curation.
        </p>
      </div>

      <form action={addDesignation} className="card flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label className="label">Label</label>
          <input name="label" className="input" required />
        </div>
        <button className="btn-secondary" type="submit">Add</button>
      </form>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="card flex items-center justify-between gap-3">
            <span className="text-sm text-sand-800">{r.label}</span>
            <form action={deleteDesignation}>
              <input type="hidden" name="id" value={r.id} />
              <button className="btn-secondary px-3 py-1.5 text-sm text-red-700" type="submit">Remove</button>
            </form>
          </div>
        ))}
        {rows.length === 0 && <p className="card text-sm text-sand-500">No designations yet.</p>}
      </div>
    </div>
  );
}
