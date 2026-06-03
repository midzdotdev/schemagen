// PR FF — web reinfer diff builder. See docs/plans/pr-ff-reinfer-reconcile.md.

import type { Change, IR } from "@schemagen/core";
import { describe, expect, it } from "vitest";
import { buildReinferDiff, touchedPaths } from "@/lib/reinfer";
import type { HistoryEntry, HistorySource } from "@/state/types";

function entry(change: Change, source: HistorySource): HistoryEntry {
  return { seq: 0, change, inverse: change, label: "", source, appliedAt: 0, clientId: "c" };
}

describe("touchedPaths", () => {
  it("collects manual/suggestion edit paths and skips inferred ops", () => {
    const entries = [
      entry({ op: "set-node", path: ["status"], node: { kind: "string" } }, "manual"),
      entry(
        { op: "add-field", path: [], name: "extra", entry: { type: { kind: "string" } } },
        "suggestion",
      ),
      entry({ op: "set-node", path: ["ignored"], node: { kind: "string" } }, "inferred"),
    ];
    const touched = touchedPaths(entries);
    expect([...touched].sort()).toEqual(["extra", "status"]);
    expect(touched.has("ignored")).toBe(false);
  });
});

describe("buildReinferDiff", () => {
  const current: IR = {
    kind: "object",
    additional: false,
    fields: { status: { type: { kind: "string" } } },
  };
  // Low-cardinality field: 2 distinct across 10 records (ratio 0.2, under the
  // 0.3 maxUniqueRatio) so defaults infer a literal union.
  const records = Array.from({ length: 10 }, (_, i) => ({ status: i < 5 ? "a" : "b" }));

  // FF-D6 — different inferenceOptions produce a different fresh IR, so the diff
  // respects the option-driven shape.
  it("FF-D6: inference options change the fresh IR and therefore the diff", () => {
    // Defaults: `status` infers a literal union → differs from the plain string.
    const withLiterals = buildReinferDiff(current, records, null, []);
    expect(withLiterals.autoChanges).toHaveLength(1);
    expect(withLiterals.autoChanges[0]?.op).toBe("set-node");

    // Literals off: `status` stays a plain string → matches current → no diff.
    const noLiterals = buildReinferDiff(current, records, { literals: { enable: false } }, []);
    expect(noLiterals.autoChanges).toHaveLength(0);
    expect(noLiterals.conflictChanges).toHaveLength(0);
  });

  it("classifies the change as a conflict when the field was touched", () => {
    const touched = [
      entry({ op: "set-node", path: ["status"], node: { kind: "string" } }, "manual"),
    ];
    const diff = buildReinferDiff(current, records, null, touched);
    expect(diff.autoChanges).toHaveLength(0);
    expect(diff.conflictChanges).toHaveLength(1);
  });
});
