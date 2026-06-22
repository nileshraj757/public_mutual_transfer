import data from "../../data/india-states-districts.json";

export interface StateBlock {
  state: string;
  districts: string[];
}

export const LOCATION_DATA = (data.states as StateBlock[]).slice().sort((a, b) =>
  a.state.localeCompare(b.state)
);

export const STATES: string[] = LOCATION_DATA.map((s) => s.state);

export function districtsFor(state: string | null | undefined): string[] {
  if (!state) return [];
  return LOCATION_DATA.find((s) => s.state === state)?.districts ?? [];
}
