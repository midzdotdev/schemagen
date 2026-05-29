import { describe, expect, it } from "vitest";
import { dedupeByIdentity } from "../../src/identity/dedupe";
import type { IdentityConfig } from "../../src/identity/types";

describe("dedupeByIdentity", () => {
  // Spec: docs/core-spec.md § "`dedupeByIdentity`" — `replace`
  it("I_D1: onDuplicate:'replace' — newest occurrence wins per identity", () => {
    const samples = [
      { id: "a", v: 1 },
      { id: "b", v: 1 },
      { id: "a", v: 2 },
      { id: "a", v: 3 },
      { id: "b", v: 2 },
    ];
    const config: IdentityConfig = { fields: [["id"]], onDuplicate: "replace" };
    const result = dedupeByIdentity(samples, config);

    // Kept: latest version per identity
    expect(result.kept).toEqual([
      { id: "a", v: 3 },
      { id: "b", v: 2 },
    ]);
    // Dropped: earlier versions of a and b
    expect(result.dropped.map((d) => d.record)).toEqual([
      { id: "a", v: 1 },
      { id: "a", v: 2 },
      { id: "b", v: 1 },
    ]);
  });

  // Spec: docs/core-spec.md § "`dedupeByIdentity`" — `skip`
  it("I_D2: onDuplicate:'skip' — first occurrence wins", () => {
    const samples = [
      { id: "a", v: 1 },
      { id: "b", v: 1 },
      { id: "a", v: 2 },
      { id: "a", v: 3 },
      { id: "b", v: 2 },
    ];
    const config: IdentityConfig = { fields: [["id"]], onDuplicate: "skip" };
    const result = dedupeByIdentity(samples, config);

    expect(result.kept).toEqual([
      { id: "a", v: 1 },
      { id: "b", v: 1 },
    ]);
    expect(result.dropped.map((d) => d.record)).toEqual([
      { id: "a", v: 2 },
      { id: "a", v: 3 },
      { id: "b", v: 2 },
    ]);
  });

  // Spec: docs/core-spec.md § "`dedupeByIdentity`" — `keep-all`
  it("I_D3: onDuplicate:'keep-all' — kept returns all records, dropped is empty", () => {
    const samples = [
      { id: "a", v: 1 },
      { id: "a", v: 2 },
      { id: "b", v: 1 },
    ];
    const config: IdentityConfig = { fields: [["id"]], onDuplicate: "keep-all" };
    const result = dedupeByIdentity(samples, config);

    expect(result.kept).toEqual(samples);
    expect(result.dropped).toEqual([]);
  });

  // Spec: docs/core-spec.md § "IdentityConfig" — `fields: Path[]`
  it("I_D4: composite key collapses on the tuple of values", () => {
    const samples = [
      { tenant: "A", localId: 1, v: 1 },
      { tenant: "B", localId: 1, v: 1 }, // different tenant, NOT a duplicate
      { tenant: "A", localId: 1, v: 2 }, // duplicate of first
      { tenant: "A", localId: 2, v: 1 },
    ];
    const config: IdentityConfig = {
      fields: [["tenant"], ["localId"]],
      onDuplicate: "skip",
    };
    const result = dedupeByIdentity(samples, config);

    expect(result.kept).toEqual([
      { tenant: "A", localId: 1, v: 1 },
      { tenant: "B", localId: 1, v: 1 },
      { tenant: "A", localId: 2, v: 1 },
    ]);
    expect(result.dropped.map((d) => d.record)).toEqual([{ tenant: "A", localId: 1, v: 2 }]);
  });

  // Spec: docs/core-spec.md § "`dedupeByIdentity`"
  // Interpretation: a record missing any identity field is never matched
  // (always kept; cannot dedupe against records with no identity).
  it("I_D5: record missing any identity field is never matched (always kept)", () => {
    const samples = [
      { id: "a", v: 1 },
      { v: 2 }, // missing id
      { id: "a", v: 3 }, // duplicate of first under skip
      { v: 4 }, // missing id, again — still kept
    ];
    const config: IdentityConfig = { fields: [["id"]], onDuplicate: "skip" };
    const result = dedupeByIdentity(samples, config);

    expect(result.kept).toEqual([{ id: "a", v: 1 }, { v: 2 }, { v: 4 }]);
    expect(result.dropped.map((d) => d.record)).toEqual([{ id: "a", v: 3 }]);
  });

  // Spec: docs/core-spec.md § "`dedupeByIdentity`" — return type
  it("I_D6: dropped entries have reason 'duplicate-identity' and carry the dropped record", () => {
    const samples = [
      { id: "x", v: 1 },
      { id: "x", v: 2 },
    ];
    const config: IdentityConfig = { fields: [["id"]], onDuplicate: "skip" };
    const result = dedupeByIdentity(samples, config);

    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]?.reason).toBe("duplicate-identity");
    expect(result.dropped[0]?.record).toEqual({ id: "x", v: 2 });
  });

  // Spec: docs/core-spec.md § "`dedupeByIdentity`" — "order-sensitive"
  it("I_D7: reversing input changes kept under replace/skip but not under keep-all", () => {
    const samples = [
      { id: "a", v: 1 },
      { id: "a", v: 2 },
      { id: "a", v: 3 },
    ];
    const reversed = samples.slice().reverse();

    const skipForward = dedupeByIdentity(samples, { fields: [["id"]], onDuplicate: "skip" });
    const skipReversed = dedupeByIdentity(reversed, { fields: [["id"]], onDuplicate: "skip" });
    expect(skipForward.kept).toEqual([{ id: "a", v: 1 }]);
    expect(skipReversed.kept).toEqual([{ id: "a", v: 3 }]);
    expect(skipForward.kept).not.toEqual(skipReversed.kept);

    const replaceForward = dedupeByIdentity(samples, { fields: [["id"]], onDuplicate: "replace" });
    const replaceReversed = dedupeByIdentity(reversed, {
      fields: [["id"]],
      onDuplicate: "replace",
    });
    expect(replaceForward.kept).toEqual([{ id: "a", v: 3 }]);
    expect(replaceReversed.kept).toEqual([{ id: "a", v: 1 }]);
    expect(replaceForward.kept).not.toEqual(replaceReversed.kept);

    const keepAllForward = dedupeByIdentity(samples, { fields: [["id"]], onDuplicate: "keep-all" });
    const keepAllReversed = dedupeByIdentity(reversed, {
      fields: [["id"]],
      onDuplicate: "keep-all",
    });
    // Same set of records, different orders — but each call's kept equals its input order.
    expect(keepAllForward.kept).toEqual(samples);
    expect(keepAllReversed.kept).toEqual(reversed);
    // Logically (as multisets), kept is unchanged under keep-all.
    expect(keepAllForward.kept.slice().reverse()).toEqual(keepAllReversed.kept);
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
    const config: IdentityConfig = { fields: [["id"]], onDuplicate: "replace" };
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

  // Spec: docs/core-spec.md § "Identity" — records are byte-deduped by canonical-stringification
  // ("non-optional"), and under keep-all "canonical-hash dedup still applies". Byte-identical
  // records (equal up to object key order) collapse; records merely sharing an identity key do not.
  it("I_D9: keep-all still removes canonically-identical records", () => {
    const samples = [
      { id: "a", v: 1 },
      { id: "a", v: 1 }, // exact duplicate of the first
      { v: 1, id: "a" }, // same value, different key order → canonical duplicate
      { id: "a", v: 2 }, // same identity key but different content → kept under keep-all
      { id: "b", v: 2 },
    ];
    const config: IdentityConfig = { fields: [["id"]], onDuplicate: "keep-all" };
    const result = dedupeByIdentity(samples, config);

    expect(result.kept).toEqual([
      { id: "a", v: 1 },
      { id: "a", v: 2 },
      { id: "b", v: 2 },
    ]);
    expect(result.dropped).toHaveLength(2);
    expect(result.dropped.every((d) => d.reason === "duplicate-record")).toBe(true);
  });
});
