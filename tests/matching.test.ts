import { describe, expect, it } from "vitest";
import {
  chainSignature,
  computeAllMatches,
  computeMatchesForUser,
  directSignature,
  findChainMatches,
  findDirectMatches,
  hasEdge,
} from "@/lib/matching/engine";
import { DEFAULT_RULES, parseRules, rulesCompatible } from "@/lib/matching/rules";
import type { MatchCandidate, RuleConfig } from "@/lib/types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function person(
  id: string,
  current: [string, string],
  prefs: [string, string][],
  over: Partial<MatchCandidate> = {}
): MatchCandidate {
  return {
    id,
    court_level: "District & Sessions Court",
    cadre: "Ministerial / Establishment staff",
    designation: "Junior Assistant",
    pay_level: "Level-2",
    current_state: current[0],
    current_district: current[1],
    preferences: prefs.map(([state, district]) => ({ state, district })),
    is_active: true,
    ...over,
  };
}

// Direct: A(Patna→Gaya) ⇄ B(Gaya→Patna)
const A = person("a", ["Bihar", "Patna"], [["Bihar", "Gaya"]]);
const B = person("b", ["Bihar", "Gaya"], [["Bihar", "Patna"]]);

// 3-way chain: C→D→E→C
const C = person("c", ["UP", "Lucknow"], [["UP", "Kanpur"]]);
const D = person("d", ["UP", "Kanpur"], [["UP", "Varanasi"]]);
const E = person("e", ["UP", "Varanasi"], [["UP", "Lucknow"]]);

describe("rules engine", () => {
  it("requires equality on all hard keys", () => {
    expect(rulesCompatible(A, B, DEFAULT_RULES)).toBe(true);
    const differentPay = person("x", ["Bihar", "Gaya"], [["Bihar", "Patna"]], { pay_level: "Level-4" });
    expect(rulesCompatible(A, differentPay, DEFAULT_RULES)).toBe(false);
  });

  it("treats null/blank attributes as incompatible", () => {
    const blank = person("x", ["Bihar", "Gaya"], [["Bihar", "Patna"]], { designation: null });
    expect(rulesCompatible(A, blank, DEFAULT_RULES)).toBe(false);
  });

  it("parses admin rules_config rows", () => {
    const rows: RuleConfig[] = [
      { id: "1", key: "cadre", label: "", value: null, is_hard_constraint: true, active: true },
      { id: "2", key: "designation", label: "", value: null, is_hard_constraint: false, active: true },
      { id: "3", key: "pay_level", label: "", value: null, is_hard_constraint: true, active: true },
      { id: "4", key: "chain_max_length", label: "", value: "4", is_hard_constraint: false, active: true },
    ];
    const parsed = parseRules(rows);
    // court_level has no row here, so it defaults ON alongside the explicit cadre/pay_level.
    expect(parsed.hardKeys.sort()).toEqual(["cadre", "court_level", "pay_level"]);
    expect(parsed.chainMaxLength).toBe(4);
  });

  it("relaxing a hard rule lets otherwise-incompatible people match", () => {
    const rows: RuleConfig[] = [
      { id: "1", key: "cadre", label: "", value: null, is_hard_constraint: true, active: true },
      { id: "2", key: "designation", label: "", value: null, is_hard_constraint: false, active: true },
      { id: "3", key: "pay_level", label: "", value: null, is_hard_constraint: true, active: true },
    ];
    const rules = parseRules(rows);
    const otherDesignation = person("z", ["Bihar", "Gaya"], [["Bihar", "Patna"]], { designation: "Stenographer" });
    expect(rulesCompatible(A, otherDesignation, DEFAULT_RULES)).toBe(false);
    expect(rulesCompatible(A, otherDesignation, rules)).toBe(true);
  });
});

describe("edges + direct matches", () => {
  it("builds a reciprocal edge for a valid pair", () => {
    expect(hasEdge(A, B, DEFAULT_RULES)).toBe(true);
    expect(hasEdge(B, A, DEFAULT_RULES)).toBe(true);
  });

  it("finds the A⇄B direct match", () => {
    const matches = findDirectMatches(A, [B, C, D, E], DEFAULT_RULES);
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("direct");
    expect(matches[0].memberIds.sort()).toEqual(["a", "b"]);
    expect(matches[0].signature).toBe(directSignature("a", "b"));
  });

  it("does not match a one-sided preference", () => {
    const oneSided = person("f", ["Bihar", "Gaya"], [["Bihar", "Nalanda"]]); // doesn't want Patna
    expect(findDirectMatches(A, [oneSided], DEFAULT_RULES)).toHaveLength(0);
  });

  it("ignores inactive candidates", () => {
    const inactiveB = { ...B, is_active: false };
    expect(findDirectMatches(A, [inactiveB], DEFAULT_RULES)).toHaveLength(0);
  });
});

describe("chain matches", () => {
  it("detects a 3-way cycle", () => {
    const chains = findChainMatches([C, D, E], DEFAULT_RULES);
    expect(chains).toHaveLength(1);
    expect(chains[0].type).toBe("chain");
    expect(chains[0].memberIds.length).toBe(3);
    expect(new Set(chains[0].memberIds)).toEqual(new Set(["c", "d", "e"]));
  });

  it("produces a rotation-stable signature", () => {
    expect(chainSignature(["c", "d", "e"])).toBe(chainSignature(["e", "c", "d"]));
    expect(chainSignature(["c", "d", "e"])).toBe(chainSignature(["d", "e", "c"]));
  });

  it("respects the configured max chain length", () => {
    const rows: RuleConfig[] = [
      { id: "1", key: "chain_max_length", label: "", value: "2", is_hard_constraint: false, active: true },
    ];
    // maxLen is floored at 3 internally, but a long cycle beyond it is excluded.
    const F = person("f", ["UP", "Lucknow"], [["UP", "Kanpur"]]);
    const G = person("g", ["UP", "Kanpur"], [["UP", "Agra"]]);
    const H = person("h", ["UP", "Agra"], [["UP", "Meerut"]]);
    const I = person("i", ["UP", "Meerut"], [["UP", "Lucknow"]]);
    const chains = findChainMatches([F, G, H, I], parseRules(rows)); // 4-cycle, maxLen→3
    expect(chains).toHaveLength(0);
  });

  it("does not report a direct pair as a chain", () => {
    const chains = findChainMatches([A, B], DEFAULT_RULES);
    expect(chains).toHaveLength(0);
  });
});

describe("per-user + global recompute", () => {
  const pool = [A, B, C, D, E];

  it("computeMatchesForUser returns only matches involving the user", () => {
    const forA = computeMatchesForUser(A, pool, DEFAULT_RULES);
    expect(forA).toHaveLength(1);
    expect(forA[0].memberIds.sort()).toEqual(["a", "b"]);

    const forC = computeMatchesForUser(C, pool, DEFAULT_RULES);
    expect(forC).toHaveLength(1);
    expect(forC[0].type).toBe("chain");
    expect(forC[0].memberIds).toContain("c");
  });

  it("computeAllMatches finds the direct pair and the chain, de-duplicated", () => {
    const all = computeAllMatches(pool, DEFAULT_RULES);
    const direct = all.filter((m) => m.type === "direct");
    const chain = all.filter((m) => m.type === "chain");
    expect(direct).toHaveLength(1);
    expect(chain).toHaveLength(1);
    // No duplicate signatures.
    expect(new Set(all.map((m) => m.signature)).size).toBe(all.length);
  });
});
