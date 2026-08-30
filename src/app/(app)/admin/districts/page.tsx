import { createClient } from "@/lib/supabase/server";
import { addDistrict, deleteDistrict } from "../actions";

export default async function DistrictsPage() {
  const supabase = createClient();
  const { data } = await supabase.from("locations").select("*").order("state").order("district");
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-1 font-semibold text-sand-900">Districts</h2>
        <p className="text-sm text-sand-600">
          The state/district reference list used across Profile, Preferences and Search. Bundled from{" "}
          <code>data/india-states-districts.json</code> at seed time — add or remove entries here as needed.
        </p>
      </div>

      <form action={addDistrict} className="card grid grid-cols-1 gap-3 sm:grid-cols-[1fr,1fr,auto] sm:items-end">
        <div>
          <label className="label">State / UT</label>
          <input name="state" className="input" required />
        </div>
        <div>
          <label className="label">District</label>
          <input name="district" className="input" required />
        </div>
        <button className="btn-secondary" type="submit">Add</button>
      </form>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="card flex items-center justify-between gap-3">
            <span className="text-sm text-sand-800">{r.district}, {r.state}</span>
            <form action={deleteDistrict}>
              <input type="hidden" name="id" value={r.id} />
              <button className="btn-secondary px-3 py-1.5 text-sm text-red-700" type="submit">Remove</button>
            </form>
          </div>
        ))}
        {rows.length === 0 && <p className="card text-sm text-sand-500">No districts yet.</p>}
      </div>
    </div>
  );
}
