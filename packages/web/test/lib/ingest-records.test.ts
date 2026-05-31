import type { IR } from "@schemagen/core";
import { describe, expect, it } from "vitest";
import { type IngestState, ingestRecords } from "@/lib/ingest-records";

const baseState: IngestState = {
  records: [],
  ir: null,
  identityConfig: null,
  identityProposalDismissed: false,
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
});
