import { describe, expect, it } from "vitest";
import type { Change } from "../../src/changes/types";
import { infer } from "../../src/infer";
import type { ObjectNode } from "../../src/ir/types";
import { merge } from "../../src/merge";
import { validate } from "../../src/validate";

// Construct an initial dataset where `status` becomes a literal union and
// `tags` is an array of strings. Need uniqueRatio for status <= 0.3 by default;
// with 10 samples and 2 unique status values, ratio = 0.2 — good.
const initialSamples = [
  { id: "u1", status: "active", tags: ["a"] },
  { id: "u2", status: "active", tags: ["b"] },
  { id: "u3", status: "pending", tags: ["c"] },
  { id: "u4", status: "active", tags: ["d"] },
  { id: "u5", status: "pending", tags: ["e"] },
  { id: "u6", status: "active", tags: ["f"] },
  { id: "u7", status: "pending", tags: ["g"] },
  { id: "u8", status: "active", tags: ["h"] },
  { id: "u9", status: "pending", tags: ["i"] },
  { id: "u10", status: "active", tags: ["j"] },
];

describe("merge", () => {
  // Spec: docs/core-spec.md § "`merge`" — "Default" comment
  it("M1: default resolution skips type-mismatch and auto-resolves literal-violation", () => {
    const ir = infer(initialSamples);
    // Construct extension samples producing both kinds:
    //   - `tags` as a non-array (number) -> type-mismatch
    //   - `status` with a new literal value -> literal-violation
    const ext = [
      // Interpretation: tags as number triggers a type-mismatch at path ["tags"]
      { id: "u6", status: "active", tags: 42 as unknown as string[] },
      { id: "u7", status: "past_due", tags: ["z"] },
    ];
    const { ir: nextIR, changes, unresolved } = merge(ir, ext);

    // literal-violation auto-applied
    expect(changes.some((c) => c.op === "add-literal")).toBe(true);

    // type-mismatch left unresolved
    expect(unresolved.some((m) => m.kind === "type-mismatch")).toBe(true);
    expect(unresolved.every((m) => m.kind === "type-mismatch")).toBe(true);

    // Sanity: returned IR has past_due as a literal on status
    expect(nextIR.kind).toBe("object");
    const obj = nextIR as ObjectNode;
    const statusType = obj.fields.status?.type;
    expect(statusType?.kind).toBe("string");
    if (statusType?.kind === "string") {
      expect(statusType.literals).toEqual(expect.arrayContaining(["past_due"]));
    }
  });

  // Spec: docs/core-spec.md § "MergeOptions"
  it("M2: custom resolution overrides defaults per-kind (literal-violation skipped)", () => {
    const ir = infer(initialSamples);
    const ext = [{ id: "u6", status: "past_due", tags: ["z"] }];
    const { changes, unresolved } = merge(ir, ext, {
      resolution: { "literal-violation": "skip" },
    });
    // No add-literal applied
    expect(changes.find((c) => c.op === "add-literal")).toBeUndefined();
    // literal-violation appears in unresolved
    expect(unresolved.some((m) => m.kind === "literal-violation")).toBe(true);
  });

  // Spec: docs/core-spec.md § "`merge`" — return shape
  it("M3: returns {ir, changes, unresolved} with `changes` in application order", () => {
    const ir = infer(initialSamples);
    // Extension with multiple distinct mismatches across two records; the
    // application order should follow validate's mismatch order.
    const ext = [
      { id: "u6", status: "past_due", tags: ["z"], extra: "new" },
      { id: "u7", status: "trialing", tags: ["y"] },
    ];
    const result = merge(ir, ext);
    expect(result).toHaveProperty("ir");
    expect(result).toHaveProperty("changes");
    expect(result).toHaveProperty("unresolved");
    expect(Array.isArray(result.changes)).toBe(true);

    // Re-validate against original to find the mismatch order produced by validate.
    const initial = validate(ir, ext);
    const expectedChangeOps: Change["op"][] = [];
    const seen = new Set<string>();
    for (const m of initial.mismatches) {
      const sig = JSON.stringify({ kind: m.kind, path: m.path, value: m.actual.value });
      if (seen.has(sig)) continue;
      seen.add(sig);
      if (m.kind === "type-mismatch") continue; // default: skip
      const change = m.suggestions[0]?.change;
      if (change) expectedChangeOps.push(change.op);
    }
    expect(result.changes.map((c) => c.op)).toEqual(expectedChangeOps);
  });

  // Spec: docs/core-spec.md § "`merge`" — return shape
  it("M4: skipped or no-suggestion mismatches appear in `unresolved`", () => {
    const ir = infer(initialSamples);
    // Extension causes a type-mismatch (skipped) and a literal-violation (auto)
    const ext = [
      { id: "u6", status: "active", tags: "not-an-array" as unknown as string[] },
      { id: "u7", status: "past_due", tags: ["x"] },
    ];
    const { unresolved } = merge(ir, ext);
    expect(unresolved.length).toBeGreaterThan(0);
    expect(unresolved.some((m) => m.kind === "type-mismatch")).toBe(true);

    // A mismatch with `skip` resolution on a kind that has suggestions still ends up unresolved.
    const { unresolved: u2 } = merge(ir, ext, {
      resolution: { "literal-violation": "skip" },
    });
    expect(u2.some((m) => m.kind === "literal-violation")).toBe(true);
  });

  // Spec: docs/core-spec.md § "`merge`" —
  // "the list of applied Changes (so they can enter history individually)"
  it("M5: applied changes appear in `changes`, each as an individual entry", () => {
    const ir = infer(initialSamples);
    const ext = [
      { id: "u6", status: "past_due", tags: ["z"], extra: "new" },
      // Trigger missing-required-field on id
      { status: "active", tags: ["y"] },
    ];
    const { changes } = merge(ir, ext);
    // Each change is a non-batch entry — history-friendly.
    for (const c of changes) {
      expect(c.op).not.toBe("batch");
    }
    // Expect at least one literal-add for status and one add-field for extra
    // and one set-optional for id.
    expect(changes.some((c) => c.op === "add-literal")).toBe(true);
    expect(changes.some((c) => c.op === "add-field")).toBe(true);
    expect(changes.some((c) => c.op === "set-optional")).toBe(true);
  });

  // Spec: docs/core-spec.md § "`merge`"
  // Interpretation: after merge, validating the same samples should
  // produce fewer (or zero) mismatches of the resolved kinds.
  it("M6: re-validating same samples after merge yields fewer mismatches of resolved kinds", () => {
    const ir = infer(initialSamples);
    const ext = [
      { id: "u6", status: "past_due", tags: ["z"], extra: "new" },
      { id: "u7", status: "trialing", tags: ["y"] },
    ];
    const before = validate(ir, ext);
    const { ir: after } = merge(ir, ext);
    const recheck = validate(after, ext);

    const resolvedKinds = new Set(["literal-violation", "unexpected-field"]);
    const beforeOfKind = before.mismatches.filter((m) => resolvedKinds.has(m.kind)).length;
    const afterOfKind = recheck.mismatches.filter((m) => resolvedKinds.has(m.kind)).length;
    expect(afterOfKind).toBeLessThan(beforeOfKind);
  });
});
