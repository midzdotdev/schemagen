import { describe, expect, it } from "vitest";
import { dedupeByIdentity, dedupeByteIdentical } from "../../src/identity/dedupe";
import type { IdentityConfig } from "../../src/identity/types";

describe("dedupeByIdentity", () => {
  // Spec: docs/core-spec.md § "`dedupeByIdentity`" — newest per identity wins
  it("I_D1: newest occurrence wins per identity", () => {
    const samples = [
      { id: "a", v: 1 },
      { id: "b", v: 1 },
      { id: "a", v: 2 },
      { id: "a", v: 3 },
      { id: "b", v: 2 },
    ];
    const config: IdentityConfig = { fields: [["id"]] };
    const result = dedupeByIdentity(samples, config);

    expect(result.kept).toEqual([
      { id: "a", v: 3 },
      { id: "b", v: 2 },
    ]);
    expect(result.dropped.map((d) => d.record)).toEqual([
      { id: "a", v: 1 },
      { id: "a", v: 2 },
      { id: "b", v: 1 },
    ]);
  });

  // Spec: docs/core-spec.md § "IdentityConfig" — `fields: Path[]`
  it("I_D4: composite key collapses on the tuple of values", () => {
    const samples = [
      { tenant: "A", localId: 1, v: 1 },
      { tenant: "B", localId: 1, v: 1 }, // different tenant, NOT a duplicate
      { tenant: "A", localId: 1, v: 2 }, // duplicate of first
      { tenant: "A", localId: 2, v: 1 },
    ];
    const config: IdentityConfig = { fields: [["tenant"], ["localId"]] };
    const result = dedupeByIdentity(samples, config);

    expect(result.kept).toEqual([
      { tenant: "A", localId: 1, v: 2 },
      { tenant: "B", localId: 1, v: 1 },
      { tenant: "A", localId: 2, v: 1 },
    ]);
    expect(result.dropped.map((d) => d.record)).toEqual([{ tenant: "A", localId: 1, v: 1 }]);
  });

  // Spec: docs/core-spec.md § "`dedupeByIdentity`"
  // Interpretation: a record missing any identity field is never matched
  // (always kept; cannot dedupe against records with no identity).
  it("I_D5: record missing any identity field is never matched (always kept)", () => {
    const samples = [
      { id: "a", v: 1 },
      { v: 2 }, // missing id
      { id: "a", v: 3 }, // duplicate of first — replaces it
      { v: 4 }, // missing id, again — still kept
    ];
    const config: IdentityConfig = { fields: [["id"]] };
    const result = dedupeByIdentity(samples, config);

    expect(result.kept).toEqual([{ id: "a", v: 3 }, { v: 2 }, { v: 4 }]);
    expect(result.dropped.map((d) => d.record)).toEqual([{ id: "a", v: 1 }]);
  });

  // Spec: docs/core-spec.md § "`dedupeByIdentity`" — null-key fallback
  // Records that don't have the identity field can't be matched against each
  // other by key, but byte-identical copies of those records should still
  // collapse — a literal re-import of identity-less data must not pile up.
  it("I_D5b: records missing identity fall back to byte-dedup", () => {
    const samples = [
      { id: "a", v: 1 },
      { v: 1 }, // missing id
      { v: 1 }, // byte-identical to the previous null-key record — dropped
      { v: 1, extra: true }, // same v but different shape — kept
      { id: "a", v: 2 }, // replaces { id: "a", v: 1 }
    ];
    const config: IdentityConfig = { fields: [["id"]] };
    const result = dedupeByIdentity(samples, config);

    expect(result.kept).toEqual([{ id: "a", v: 2 }, { v: 1 }, { v: 1, extra: true }]);
    expect(result.dropped).toHaveLength(2);
    const reasons = result.dropped.map((d) => d.reason).sort();
    expect(reasons).toEqual(["duplicate-identity", "duplicate-record"]);
  });

  // Spec: docs/core-spec.md § "`dedupeByIdentity`" — return type
  it("I_D6: dropped entries have reason 'duplicate-identity' and carry the dropped record", () => {
    const samples = [
      { id: "x", v: 1 },
      { id: "x", v: 2 },
    ];
    const config: IdentityConfig = { fields: [["id"]] };
    const result = dedupeByIdentity(samples, config);

    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]?.reason).toBe("duplicate-identity");
    expect(result.dropped[0]?.record).toEqual({ id: "x", v: 1 });
  });

  // Spec: docs/core-spec.md § "`dedupeByIdentity`" — "order-sensitive"
  it("I_D7: reversing input changes which version is kept", () => {
    const samples = [
      { id: "a", v: 1 },
      { id: "a", v: 2 },
      { id: "a", v: 3 },
    ];
    const reversed = samples.slice().reverse();

    const forward = dedupeByIdentity(samples, { fields: [["id"]] });
    const reversedResult = dedupeByIdentity(reversed, { fields: [["id"]] });
    expect(forward.kept).toEqual([{ id: "a", v: 3 }]);
    expect(reversedResult.kept).toEqual([{ id: "a", v: 1 }]);
    expect(forward.kept).not.toEqual(reversedResult.kept);
  });

  // Spec: docs/core-spec.md § "Module surface" — determinism
  it("I_D8: pure / deterministic — repeated runs produce equal output", () => {
    const samples = [
      { id: "a", v: 1 },
      { id: "b", v: 1 },
      { id: "a", v: 2 },
      { v: 3 }, // missing id
      { id: "c", v: 1 },
      { id: "b", v: 2 },
    ];
    const config: IdentityConfig = { fields: [["id"]] };
    const r1 = dedupeByIdentity(samples, config);
    const r2 = dedupeByIdentity(samples, config);
    expect(r1).toEqual(r2);
    // Input must not be mutated.
    expect(samples).toEqual([
      { id: "a", v: 1 },
      { id: "b", v: 1 },
      { id: "a", v: 2 },
      { v: 3 },
      { id: "c", v: 1 },
      { id: "b", v: 2 },
    ]);
  });
});

describe("dedupeByteIdentical", () => {
  // Spec: docs/core-spec.md § "Identity" — byte-dedup is the floor when no
  // identity config is set. Records canonically equal (sorted-key) collapse.
  it("I_B1: removes canonically-identical records", () => {
    const samples = [
      { id: "a", v: 1 },
      { id: "a", v: 1 }, // exact duplicate of the first
      { v: 1, id: "a" }, // same value, different key order → canonical duplicate
      { id: "a", v: 2 }, // different content → kept
      { id: "b", v: 2 },
    ];
    const result = dedupeByteIdentical(samples);

    expect(result.kept).toEqual([
      { id: "a", v: 1 },
      { id: "a", v: 2 },
      { id: "b", v: 2 },
    ]);
    expect(result.dropped).toHaveLength(2);
    expect(result.dropped.every((d) => d.reason === "duplicate-record")).toBe(true);
  });

  it("I_B2: pure / deterministic — repeated runs produce equal output", () => {
    const samples = [{ a: 1 }, { b: 2 }, { a: 1 }];
    const r1 = dedupeByteIdentical(samples);
    const r2 = dedupeByteIdentical(samples);
    expect(r1).toEqual(r2);
    expect(samples).toEqual([{ a: 1 }, { b: 2 }, { a: 1 }]);
  });
});
