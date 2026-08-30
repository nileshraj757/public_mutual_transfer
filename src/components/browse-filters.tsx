"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CADRE_CATEGORIES, GRADE_PAY_OPTIONS } from "@/lib/judiciary";
import { LocationSelect } from "@/components/location-select";

export function BrowseFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const [cadre, setCadre] = useState(params.get("cadre") ?? "");
  const [designation, setDesignation] = useState(params.get("designation") ?? "");
  const [pay, setPay] = useState(params.get("pay_level") ?? "");
  const [state, setState] = useState(params.get("state") ?? "");
  const [district, setDistrict] = useState(params.get("district") ?? "");
  const [related, setRelated] = useState(params.get("related") === "1");

  function search() {
    const sp = new URLSearchParams();
    // "Show other related posts" drops the cadre/designation/pay-level filters
    // (location filters still apply) so nearby-but-not-exact postings show up.
    const fields: Record<string, string> = related
      ? { state, district }
      : { cadre, designation, pay_level: pay, state, district };
    for (const [k, v] of Object.entries(fields)) if (v) sp.set(k, v);
    if (related) sp.set("related", "1");
    router.push(`/browse?${sp.toString()}`);
  }

  function clear() {
    setCadre("");
    setDesignation("");
    setPay("");
    setState("");
    setDistrict("");
    setRelated(false);
    router.push("/browse");
  }

  return (
    <div className="ts-card space-y-3">
      <LocationSelect
        defaultState={state}
        defaultDistrict={district}
        onChange={(s, d) => {
          setState(s);
          setDistrict(d);
        }}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="ts-label">Cadre</label>
          <select className="ts-input" value={cadre} disabled={related} onChange={(e) => setCadre(e.target.value)}>
            <option value="">Any</option>
            {CADRE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="ts-label">Designation / post</label>
          <input
            className="ts-input"
            value={designation}
            placeholder="Any"
            disabled={related}
            onChange={(e) => setDesignation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <div>
          <label className="ts-label">Grade pay</label>
          <select className="ts-input" value={pay} disabled={related} onChange={(e) => setPay(e.target.value)}>
            <option value="">Any</option>
            {GRADE_PAY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ts-muted)" }}>
        <input type="checkbox" checked={related} onChange={(e) => setRelated(e.target.checked)} />
        Show other related posts (ignore cadre/designation/pay level filters)
      </label>
      <div className="flex gap-2">
        <button type="button" className="ts-btn-primary px-4 py-2.5 text-xs" onClick={search}>
          Search
        </button>
        <button type="button" className="ts-btn-secondary px-4 py-2.5 text-xs" onClick={clear}>
          Clear
        </button>
      </div>
    </div>
  );
}
