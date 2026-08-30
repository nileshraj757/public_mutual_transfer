// Deno port of the pure matching engine (src/lib/matching/engine.ts + rules.ts).
// Kept in sync with those files — they contain no runtime deps, only types, so
// this is a faithful copy. The web app and this function share the SAME
// algorithm; if you change one, change both.

// ── Types (subset of src/lib/types.ts) ────────────────────────────────────────
export interface MatchCandidate {
  id: string;
  court_level: string | null;
  cadre: string | null;
  designation: string | null;
  pay_level: string | null;
  current_state: string | null;
  current_district: string | null;
  is_active: boolean;
  preferences: { state: string; district: string }[];
  relaxed_rules: string[];
}
export interface DiscoveredMatch {
  type: "direct" | "chain";
  memberIds: string[];
  signature: string;
}
export interface RuleConfig {
  key: string;
  value: string | null;
  is_hard_constraint: boolean;
  active: boolean;
}

// ── Rules ─────────────────────────────────────────────────────────────────────
export type HardKey = "court_level" | "cadre" | "designation" | "pay_level";
const ALL_HARD_KEYS: HardKey[] = ["court_level", "cadre", "designation", "pay_level"];

export interface MatchRules {
  hardKeys: HardKey[];
  chainMaxLength: number;
  coolingOffMonths: number | null;
  showSeniority: boolean;
}

export function parseRules(rows: RuleConfig[]): MatchRules {
  const active = rows.filter((r) => r.active);
  const byKey = new Map(active.map((r) => [r.key, r]));

  const hardKeys = ALL_HARD_KEYS.filter((k) => {
    const row = byKey.get(k);
    return row ? row.is_hard_constraint : true;
  });

  const chainRow = byKey.get("chain_max_length");
  const chainMaxLength = clamp(parseInt(chainRow?.value ?? "5", 10) || 5, 2, 8);

  const coolRow = byKey.get("cooling_off_months");
  const coolingOffMonths = coolRow?.value ? parseInt(coolRow.value, 10) || null : null;

  const senRow = byKey.get("show_seniority");
  const showSeniority = senRow ? senRow.value !== "false" : true;

  return {
    hardKeys: hardKeys.length ? hardKeys : [...ALL_HARD_KEYS],
    chainMaxLength,
    coolingOffMonths,
    showSeniority,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

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

// ── Engine ────────────────────────────────────────────────────────────────────
const locKey = (state: string | null, district: string | null) =>
  `${(state ?? "").trim().toLowerCase()}||${(district ?? "").trim().toLowerCase()}`;
const prefSet = (c: MatchCandidate) =>
  new Set(c.preferences.map((p) => locKey(p.state, p.district)));

function wantsLocationOf(mover: MatchCandidate, target: MatchCandidate): boolean {
  if (!target.current_state || !target.current_district) return false;
  return prefSet(mover).has(locKey(target.current_state, target.current_district));
}

export function hasEdge(mover: MatchCandidate, target: MatchCandidate, rules: MatchRules): boolean {
  if (mover.id === target.id) return false;
  if (!mover.is_active || !target.is_active) return false;
  return wantsLocationOf(mover, target) && rulesCompatible(mover, target, rules);
}

export function directSignature(a: string, b: string): string {
  return "direct:" + [a, b].sort().join("|");
}

export function chainSignature(cycle: string[]): string {
  let minIdx = 0;
  for (let i = 1; i < cycle.length; i++) if (cycle[i] < cycle[minIdx]) minIdx = i;
  const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
  return "chain:" + rotated.join(">");
}

export function findDirectMatches(
  me: MatchCandidate,
  others: MatchCandidate[],
  rules: MatchRules
): DiscoveredMatch[] {
  const out: DiscoveredMatch[] = [];
  if (!me.is_active) return out;
  for (const other of others) {
    if (other.id === me.id || !other.is_active) continue;
    if (hasEdge(me, other, rules) && hasEdge(other, me, rules)) {
      out.push({
        type: "direct",
        memberIds: [me.id, other.id],
        signature: directSignature(me.id, other.id),
      });
    }
  }
  return out;
}

export function findChainMatches(
  candidates: MatchCandidate[],
  rules: MatchRules,
  opts: { mustInclude?: string } = {}
): DiscoveredMatch[] {
  const maxLen = Math.max(3, rules.chainMaxLength);
  const active = candidates.filter((c) => c.is_active);
  const byId = new Map(active.map((c) => [c.id, c]));
  const ids = active.map((c) => c.id);

  const adj = new Map<string, string[]>();
  for (const a of active) {
    const list: string[] = [];
    for (const b of active) if (hasEdge(a, b, rules)) list.push(b.id);
    adj.set(a.id, list);
  }

  const found = new Map<string, string[]>();

  for (const start of ids) {
    const path: string[] = [start];
    const onPath = new Set<string>([start]);

    const dfs = (current: string) => {
      for (const next of adj.get(current) ?? []) {
        if (next === start) {
          if (path.length >= 3 && path.length <= maxLen) {
            const sig = chainSignature(path);
            if (!found.has(sig)) found.set(sig, [...path]);
          }
          continue;
        }
        if (next < start) continue;
        if (onPath.has(next)) continue;
        if (path.length >= maxLen) continue;
        path.push(next);
        onPath.add(next);
        dfs(next);
        path.pop();
        onPath.delete(next);
      }
    };

    dfs(start);
  }

  let cycles = [...found.values()];
  if (opts.mustInclude) cycles = cycles.filter((c) => c.includes(opts.mustInclude!));
  cycles = cycles.filter((c) => c.every((id) => byId.has(id)));

  return cycles.map((cycle) => ({
    type: "chain" as const,
    memberIds: cycle,
    signature: chainSignature(cycle),
  }));
}

export function computeMatchesForUser(
  me: MatchCandidate,
  pool: MatchCandidate[],
  rules: MatchRules
): DiscoveredMatch[] {
  const others = pool.filter((c) => c.id !== me.id);
  const direct = findDirectMatches(me, others, rules);
  const chains = findChainMatches([me, ...others], rules, { mustInclude: me.id });

  const seen = new Set<string>();
  const result: DiscoveredMatch[] = [];
  for (const m of [...direct, ...chains]) {
    if (seen.has(m.signature)) continue;
    seen.add(m.signature);
    result.push(m);
  }
  return result;
}
