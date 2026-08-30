"use client";

import { useMemo, useState } from "react";
import { LOCATION_DATA } from "@/lib/locations";

interface LocationSelectProps {
  stateName?: string;
  districtName?: string;
  defaultState?: string;
  defaultDistrict?: string;
  required?: boolean;
  onChange?: (state: string, district: string) => void;
}

/** Cascading State → District selects backed by the bundled dataset. */
export function LocationSelect({
  stateName = "state",
  districtName = "district",
  defaultState = "",
  defaultDistrict = "",
  required,
  onChange,
}: LocationSelectProps) {
  const [state, setState] = useState(defaultState);
  const [district, setDistrict] = useState(defaultDistrict);

  const states = useMemo(() => LOCATION_DATA.map((s) => s.state), []);
  const districts = useMemo(
    () => LOCATION_DATA.find((s) => s.state === state)?.districts ?? [],
    [state]
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="ts-label">State / UT</label>
        <select
          name={stateName}
          required={required}
          className="ts-input"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setDistrict("");
            onChange?.(e.target.value, "");
          }}
        >
          <option value="">Select state…</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="ts-label">District</label>
        <select
          name={districtName}
          required={required}
          className="ts-input"
          value={district}
          disabled={!state}
          onChange={(e) => {
            setDistrict(e.target.value);
            onChange?.(state, e.target.value);
          }}
        >
          <option value="">{state ? "Select district…" : "Select state first"}</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
