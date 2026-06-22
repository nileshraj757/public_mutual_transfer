"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LOCATION_DATA } from "@/lib/locations";

const PAY_LEVELS = ["Level-1", "Level-2", "Level-3", "Level-4", "Level-5", "Level-6", "Level-7"];

export function BrowseFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const state = params.get("state") ?? "";
  const district = params.get("district") ?? "";
  const designation = params.get("designation") ?? "";
  const pay = params.get("pay_level") ?? "";

  const districts = LOCATION_DATA.find((s) => s.state === state)?.districts ?? [];

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    router.push(`/browse?${sp.toString()}`);
  }

  return (
    <div className="card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="label">State / UT</label>
        <select className="input" value={state} onChange={(e) => update({ state: e.target.value, district: "" })}>
          <option value="">Any</option>
          {LOCATION_DATA.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
        </select>
      </div>
      <div>
        <label className="label">District</label>
        <select className="input" value={district} disabled={!state} onChange={(e) => update({ district: e.target.value })}>
          <option value="">Any</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Designation</label>
        <input className="input" defaultValue={designation} placeholder="Any" onBlur={(e) => update({ designation: e.target.value })} onKeyDown={(e) => e.key === "Enter" && update({ designation: (e.target as HTMLInputElement).value })} />
      </div>
      <div>
        <label className="label">Pay level</label>
        <select className="input" value={pay} onChange={(e) => update({ pay_level: e.target.value })}>
          <option value="">Any</option>
          {PAY_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
    </div>
  );
}
