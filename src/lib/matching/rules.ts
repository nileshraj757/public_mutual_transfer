import type { MatchCandidate, RuleConfig } from "@/lib/types";

/** The hard-constraint attributes the engine can equality-check on a profile. */
export type HardKey = "court_level" | "cadre" | "designation" | "pay_level";
const ALL_HARD_KEYS: HardKey[] = ["court_level", "cadre", "designation", "pay_level"];

export interface MatchRules {
  /** Attributes that must be EQUAL for a swap to be valid. */
  hardKeys: HardKey[];
  /** Max members in a chain (cyclic swap). */
  chainMaxLength: number;
  /** Soft cooling-off window since last transfer, in months (display only). */
  coolingOffMonths: number | null;
  showSeniority: boolean;
}

export const DEFAULT_RULES: MatchRules = {
  hardKeys: [...ALL_HARD_KEYS],
  chainMaxLength: 5,
  coolingOffMonths: 12,
  showSeniority: true,
};

/** Turn admin-editable rules_config rows into a typed config for the engine. */
export function parseRules(rows: RuleConfig[]): MatchRules {
  const active = rows.filter((r) => r.active);
  const byKey = new Map(active.map((r) => [r.key, r]));

  const hardKeys = ALL_HARD_KEYS.filter((k) => {
    const row = byKey.get(k);
    return row ? row.is_hard_constraint : true; // default on if unspecified
  });

  const chainRow = byKey.get("chain_max_length");
  const chainMaxLength = clamp(parseInt(chainRow?.value ?? "5", 10) || 5, 2, 8);

  const coolRow = byKey.get("cooling_off_months");
  const coolingOffMonths = coolRow?.value ? parseInt(coolRow.value, 10) || null : null;

  const senRow = byKey.get("show_seniority");
  const showSeniority = senRow ? senRow.value !== "false" : true;

  return { hardKeys: hardKeys.length ? hardKeys : [...ALL_HARD_KEYS], chainMaxLength, coolingOffMonths, showSeniority };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/**
 * Whether two employees satisfy all HARD equality constraints. A null/blank
 * value on either side fails the check (we can't confirm equality).
 *
 * A key is skipped only when BOTH sides have opted to relax it
 * (profiles.relaxed_rules) — a mismatch only surfaces when neither party
 * actually cares about that attribute.
 */
export function rulesCompatible(
  a: Pick<MatchCandidate, HardKey | "relaxed_rules">,
  b: Pick<MatchCandidate, HardKey | "relaxed_rules">,
  rules: MatchRules
): boolean {
  return rules.hardKeys.every((k) => {
    if (a.relaxed_rules.includes(k) && b.relaxed_rules.includes(k)) return true;
    const av = norm(a[k]);
    const bv = norm(b[k]);
    return av !== "" && av === bv;
  });
}
