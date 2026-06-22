import type { DiscoveredMatch, MatchCandidate } from "@/lib/types";
import { rulesCompatible, type MatchRules } from "./rules";

// ── Location helpers ──────────────────────────────────────────────────────────

const locKey = (state: string | null, district: string | null) =>
  `${(state ?? "").trim().toLowerCase()}||${(district ?? "").trim().toLowerCase()}`;

const prefSet = (c: MatchCandidate) =>
  new Set(c.preferences.map((p) => locKey(p.state, p.district)));

/** Does `mover` want to move to `target`'s current location? */
function wantsLocationOf(mover: MatchCandidate, target: MatchCandidate): boolean {
  if (!target.current_state || !target.current_district) return false;
  return prefSet(mover).has(locKey(target.current_state, target.current_district));
}

/** A directed edge mover→target exists when mover wants target's location AND
 *  they are rule-compatible (hard equality holds). */
export function hasEdge(mover: MatchCandidate, target: MatchCandidate, rules: MatchRules): boolean {
  if (mover.id === target.id) return false;
  if (!mover.is_active || !target.is_active) return false;
  return wantsLocationOf(mover, target) && rulesCompatible(mover, target, rules);
}

// ── Signatures (stable de-dup keys persisted on the matches table) ────────────

export function directSignature(a: string, b: string): string {
  return "direct:" + [a, b].sort().join("|");
}

/** Rotation-canonical signature for a directed cycle (starts at the smallest id,
 *  preserves direction) so the same cycle isn't stored twice across recomputes. */
export function chainSignature(cycle: string[]): string {
  let minIdx = 0;
  for (let i = 1; i < cycle.length; i++) if (cycle[i] < cycle[minIdx]) minIdx = i;
  const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
  return "chain:" + rotated.join(">");
}

// ── Direct matches ────────────────────────────────────────────────────────────

/**
 * Direct (A⇄B) matches for `me`: each side's current location is in the other's
 * preferred list AND all hard rules pass.
 */
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

// ── Chain (cyclic) matches via bounded DFS cycle enumeration ──────────────────

/**
 * Find chain matches (cycles of length 3..maxLen) in the directed
 * "wants-to-move-to" graph. Optionally restrict to cycles that include
 * `mustInclude` (the current user) so we don't recompute the whole graph.
 *
 * To keep each cycle unique we only start a DFS from the smallest id in the
 * cycle (a node may only extend a path to ids strictly greater than the start),
 * then dedup remaining direction variants by signature.
 */
export function findChainMatches(
  candidates: MatchCandidate[],
  rules: MatchRules,
  opts: { mustInclude?: string } = {}
): DiscoveredMatch[] {
  const maxLen = Math.max(3, rules.chainMaxLength);
  const active = candidates.filter((c) => c.is_active);
  const byId = new Map(active.map((c) => [c.id, c]));
  const ids = active.map((c) => c.id);

  // Adjacency: a -> [b, ...]
  const adj = new Map<string, string[]>();
  for (const a of active) {
    const list: string[] = [];
    for (const b of active) if (hasEdge(a, b, rules)) list.push(b.id);
    adj.set(a.id, list);
  }

  const found = new Map<string, string[]>(); // signature -> cycle

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
        // Canonical: start must remain the minimum id in the cycle.
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
  if (opts.mustInclude) {
    cycles = cycles.filter((c) => c.includes(opts.mustInclude!));
  }
  // Drop any cycle referencing an unknown id (defensive).
  cycles = cycles.filter((c) => c.every((id) => byId.has(id)));

  return cycles.map((cycle) => ({
    type: "chain" as const,
    memberIds: cycle,
    signature: chainSignature(cycle),
  }));
}

/**
 * Full recompute for a single user: direct matches + any chains the user is part
 * of. Returns de-duplicated DiscoveredMatch[] ready to upsert into `matches`.
 */
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

/** Recompute ALL matches across the whole pool (used by admin / batch jobs). */
export function computeAllMatches(pool: MatchCandidate[], rules: MatchRules): DiscoveredMatch[] {
  const seen = new Set<string>();
  const result: DiscoveredMatch[] = [];

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];
      if (hasEdge(a, b, rules) && hasEdge(b, a, rules)) {
        const sig = directSignature(a.id, b.id);
        if (!seen.has(sig)) {
          seen.add(sig);
          result.push({ type: "direct", memberIds: [a.id, b.id], signature: sig });
        }
      }
    }
  }

  for (const m of findChainMatches(pool, rules)) {
    if (!seen.has(m.signature)) {
      seen.add(m.signature);
      result.push(m);
    }
  }
  return result;
}
