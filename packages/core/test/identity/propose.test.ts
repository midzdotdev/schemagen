import { describe, expect, it } from "vitest";
import { proposeIdentityKey } from "../../src/identity/propose";

describe("proposeIdentityKey", () => {
  // Spec: docs/core-spec.md § "`proposeIdentityKey`" + § "IdentityProposal"
  it("I_PR1: a field unique in 100% and present in 100% is proposed with confidence 1.0/1.0", () => {
    const samples = [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
      { id: "c", name: "Carol" },
      { id: "d", name: "Dan" },
    ];
    const result = proposeIdentityKey(samples);
    expect(result).not.toBeNull();
    expect(result?.fields).toEqual([["id"]]);
    expect(result?.confidence.uniqueness).toBe(1);
    expect(result?.confidence.presence).toBe(1);
  });

  // Spec: docs/core-spec.md § "`proposeIdentityKey`" — default thresholds uniqueness >= 0.95, presence >= 0.95
  it("I_PR2: a field unique in 95% and present in 96% is proposed", () => {
    // 96 records have `id` present (96% presence). Of those 96, the value `u0` occurs
    // twice, so 94 records carry a value that is unique to them. Per spec, uniqueness is
    // the fraction of (present) records whose key value is unique → 94/96 ≈ 0.979.
    const samples: unknown[] = [];
    for (let i = 0; i < 95; i++) samples.push({ id: `u${i}`, other: i });
    // 1 duplicate id: now `u0` appears twice, so those 2 records are not unique.
    samples.push({ id: "u0", other: 999 });
    // 4 records missing id (presence = 96/100)
    for (let i = 0; i < 4; i++) samples.push({ other: 10_000 + i });

    const result = proposeIdentityKey(samples);
    expect(result).not.toBeNull();
    expect(result?.fields).toEqual([["id"]]);
    expect(result?.confidence.presence).toBeCloseTo(0.96, 5);
    expect(result?.confidence.uniqueness).toBeCloseTo(94 / 96, 5);
  });

  // Spec: docs/core-spec.md § "`proposeIdentityKey`" — uniqueness is "the fraction of records
  // with a unique value", NOT the distinct/total ratio. The two diverge when a value repeats:
  // a value occurring twice contributes 1 to the distinct count but 0 unique records.
  it("I_PR8: uniqueness counts records with a unique value, not distinct values", () => {
    // 100 records, `id` present in all. 98 records carry a one-off value; `dupA` occurs twice.
    // distinct ids = 99 → distinct/total = 0.99 (would wrongly clear the bar at exactly the value).
    // records with a unique value = 98 → spec uniqueness = 0.98.
    const samples: unknown[] = [];
    for (let i = 0; i < 98; i++) samples.push({ id: `u${i}`, grp: i % 4 });
    samples.push({ id: "dupA", grp: 0 });
    samples.push({ id: "dupA", grp: 1 });

    const result = proposeIdentityKey(samples);
    expect(result).not.toBeNull();
    expect(result?.fields).toEqual([["id"]]);
    expect(result?.confidence.uniqueness).toBeCloseTo(0.98, 5);
  });

  // Spec: docs/core-spec.md § "`proposeIdentityKey`" — uniqueness threshold 0.95
  it("I_PR3: a field unique in 94% is not proposed", () => {
    // 100 records, all present, but uniqueness = 94/100 (6 duplicates)
    // Other fields should not qualify either.
    const samples: unknown[] = [];
    for (let i = 0; i < 94; i++) samples.push({ id: `u${i}`, group: i % 3 });
    // 6 duplicate ids
    for (let i = 0; i < 6; i++) samples.push({ id: `u${i}`, group: i % 3 });

    const result = proposeIdentityKey(samples);
    expect(result).toBeNull();
  });

  // Spec: docs/core-spec.md § "`proposeIdentityKey`" — "If no single field qualifies, the function tries pairs"
  it("I_PR4: no single field clears the threshold, but a pair does → pair returned", () => {
    // Construct: tenant + localId uniquely identifies, neither alone does.
    const samples: unknown[] = [];
    // 50 records in tenant "A", localId 0..49
    for (let i = 0; i < 50; i++) samples.push({ tenant: "A", localId: i });
    // 50 records in tenant "B", localId 0..49 (collisions on localId alone; tenant alone is not unique either)
    for (let i = 0; i < 50; i++) samples.push({ tenant: "B", localId: i });

    const result = proposeIdentityKey(samples);
    expect(result).not.toBeNull();
    expect(result?.fields.length).toBe(2);
    const flatNames = result?.fields.map((p) => p.join(".")).sort();
    expect(flatNames).toEqual(["localId", "tenant"]);
    expect(result?.confidence.uniqueness).toBeGreaterThanOrEqual(0.95);
    expect(result?.confidence.presence).toBeGreaterThanOrEqual(0.95);
  });

  // Spec: docs/core-spec.md § "`proposeIdentityKey`" — "Returns ... null when nothing clears"
  it("I_PR5: no single field and no pair clears → null", () => {
    // Every record has the same two fields, both with very low uniqueness.
    // Pairs of these two are still low uniqueness.
    const samples: unknown[] = [];
    for (let i = 0; i < 100; i++) {
      samples.push({ category: i % 3, status: i % 2 === 0 ? "open" : "closed" });
    }
    const result = proposeIdentityKey(samples);
    expect(result).toBeNull();
  });

  // Spec: docs/core-spec.md § "`proposeIdentityKey`" — "It does not try triples"
  it("I_PR6: triples are never tried — only-triple-unique dataset → null", () => {
    // Construct: 3 fields a, b, c, each with low uniqueness alone and in pairs,
    // but the triple is fully unique.
    // Use a, b, c each in {0,1,2,3}; combine such that (a,b), (a,c), (b,c) each repeat,
    // but (a,b,c) is unique.
    const samples: unknown[] = [];
    // Build 64 = 4^3 unique triples
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        for (let c = 0; c < 4; c++) {
          samples.push({ a, b, c });
        }
      }
    }
    // Each single field has only 4 distinct values across 64 records → uniqueness 4/64 = 0.0625, fails.
    // Each pair has 16 distinct values across 64 records → uniqueness 16/64 = 0.25, fails.
    // Triple is fully unique but spec says triples are not tried.
    const result = proposeIdentityKey(samples);
    expect(result).toBeNull();
  });

  // Spec: docs/core-spec.md § "IdentityProposal" — `rationale`
  it("I_PR7: proposal's rationale is a non-empty human-readable string", () => {
    const samples = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const result = proposeIdentityKey(samples);
    expect(result).not.toBeNull();
    expect(typeof result?.rationale).toBe("string");
    expect((result?.rationale ?? "").length).toBeGreaterThan(0);
  });
});
