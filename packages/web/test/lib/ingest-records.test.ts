import type { InferOptions, IR } from "@schemagen/core";
import { describe, expect, it } from "vitest";
import { type IngestState, ingestRecords } from "@/lib/ingest-records";

const baseState: IngestState = {
  records: [],
  ir: null,
  identityConfig: null,
  identityProposalDismissed: false,
  inferenceOptions: null,
};

describe("ingestRecords", () => {
  it("dedupes incoming records against existing by canonical hash", () => {
    const r = ingestRecords({ ...baseState, records: [{ id: 1 }, { id: 2 }] }, [
      { id: 2 },
      { id: 3 },
    ]);
    expect(r.records).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("infers an IR on the cold start (no existing ir, non-empty merged set)", () => {
    const r = ingestRecords(baseState, [{ id: "a", status: "active" }]);
    expect(r.ir).not.toBeNull();
    expect(r.ir?.kind).toBe("object");
  });

  it("keeps the existing IR when one is already set", () => {
    const ir: IR = { kind: "object", fields: {}, additional: true };
    const r = ingestRecords({ ...baseState, ir }, [{ id: "a" }]);
    expect(r.ir).toBe(ir);
  });

  it("returns identityProposal set when a unique field is present", () => {
    const r = ingestRecords(baseState, [{ id: "a" }, { id: "b" }]);
    expect(r.identityProposal?.fields).toEqual([["id"]]);
  });

  it("returns identityProposal: undefined when an identityConfig is already set", () => {
    const r = ingestRecords(
      { ...baseState, identityConfig: { fields: [["id"]], onDuplicate: "replace" } },
      [{ id: "a" }, { id: "b" }],
    );
    expect(r.identityProposal).toBeUndefined();
  });

  it("returns identityProposal: undefined when the suggestion was dismissed", () => {
    const r = ingestRecords({ ...baseState, identityProposalDismissed: true }, [
      { id: "a" },
      { id: "b" },
    ]);
    expect(r.identityProposal).toBeUndefined();
  });

  it("applies identityConfig dedupe on the merged set", () => {
    const r = ingestRecords(
      {
        ...baseState,
        records: [{ id: "a", v: 1 }],
        identityConfig: { fields: [["id"]], onDuplicate: "replace" },
      },
      [{ id: "a", v: 2 }, { id: "b" }],
    );
    // 'a' newer replaces the older entry; 'b' is fresh.
    expect(r.records).toHaveLength(2);
    expect((r.records[0] as { id: string }).id).toBe("a");
    expect((r.records[0] as { v: number }).v).toBe(2);
  });

  // PR Z — workspace-scoped inference options thread into cold-start infer().
  // Plan: docs/plans/pr-z-inference-options.md § "Wiring".

  // 100 records, `kind` cycles through 25 unique strings (4 occurrences each).
  // Each record is unique by `id`, so byteDedup keeps all 100.
  // For `kind`: cardinality=25, total=100, ratio=0.25 (≤ default 0.3).
  const buildKindRecords = (): unknown[] =>
    Array.from({ length: 100 }, (_, i) => ({ id: i, kind: `kind-${i % 25}` }));

  // Plan: § "Tests" — "ingestRecords with custom maxCardinality: 30 produces a literal union from 25-unique data."
  it("Z-I1: cold-start with maxCardinality=30 produces a literal union for the 25-unique field", () => {
    const options: InferOptions = { literals: { maxCardinality: 30 } };
    const r = ingestRecords({ ...baseState, inferenceOptions: options }, buildKindRecords());
    expect(r.ir?.kind).toBe("object");
    const kindField = r.ir?.kind === "object" ? r.ir.fields.kind?.type : undefined;
    expect(kindField?.kind).toBe("string");
    if (kindField?.kind === "string") {
      expect(kindField.literals).toBeDefined();
      expect(kindField.literals).toHaveLength(25);
    }
  });

  // Plan: § "The tension to address" — control case: default maxCardinality=20 leaves the field as bare string.
  it("Z-I2: cold-start without inferenceOptions leaves a 25-unique field as bare string", () => {
    const r = ingestRecords(baseState, buildKindRecords());
    const kindField = r.ir?.kind === "object" ? r.ir.fields.kind?.type : undefined;
    expect(kindField?.kind).toBe("string");
    if (kindField?.kind === "string") {
      expect(kindField.literals).toBeUndefined();
    }
  });

  // Plan: § "Scope" — "Out: Re-inference after an IR exists." Options are inert once IR is set.
  it("Z-I3: post-IR ingest preserves the existing IR regardless of inferenceOptions", () => {
    const existingIR: IR = { kind: "object", fields: {}, additional: true };
    const options: InferOptions = { literals: { maxCardinality: 30 } };
    const r = ingestRecords(
      { ...baseState, ir: existingIR, inferenceOptions: options },
      buildKindRecords(),
    );
    // Same reference — infer was not called at all.
    expect(r.ir).toBe(existingIR);
  });
});
