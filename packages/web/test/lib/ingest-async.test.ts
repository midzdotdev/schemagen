// Spec: docs/frontend-spec.md § "Ingest pipeline" — async wrapper around
// ingestRecords. The worker path needs a real browser environment; under
// jsdom the wrapper falls back to inline execution and we verify the
// fallback behaves like the synchronous helper.

import { describe, expect, it } from "vitest";
import { ingestAsync } from "@/lib/ingest-async";
import type { IngestState } from "@/lib/ingest-records";

const emptyState: IngestState = {
  records: [],
  ir: null,
  identityConfig: null,
  identityProposalDismissed: false,
  inferenceOptions: null,
};

describe("ingestAsync", () => {
  // Interpretation: in test environments without a real Worker (vitest +
  // jsdom), the wrapper degrades to synchronous ingestRecords. The result
  // must still resolve through the same Promise interface DataPanel awaits.
  it("Y-A1: resolves with an IngestResult shape", async () => {
    const result = await ingestAsync(emptyState, [{ id: "a" }, { id: "b" }]);
    expect(result.records).toHaveLength(2);
    // PR AA — cold-start no longer auto-infers; the user calls inferSchema()
    // explicitly. ir stays null here even though records arrived.
    expect(result.ir).toBeNull();
    // identityProposal is computed in the fallback path too.
    expect(result.identityProposal !== undefined).toBe(true);
  });

  // Interpretation: empty incoming + empty state is the cold-start no-op —
  // wrapper should resolve cleanly with no IR (nothing to infer from).
  it("Y-A2: empty input round-trips without error", async () => {
    const result = await ingestAsync(emptyState, []);
    expect(result.records).toEqual([]);
    expect(result.ir).toBeNull();
  });

  // Interpretation: when an IR is already set, the cold-start branch of
  // ingestRecords is skipped — the wrapper must preserve that behaviour so
  // the caller's `if (!ir && result.ir) setIR(...)` guard stays meaningful.
  it("Y-A3: preserves the existing IR when one is supplied", async () => {
    const ir = { kind: "object" as const, fields: {}, additional: false };
    const state: IngestState = { ...emptyState, ir };
    const result = await ingestAsync(state, [{ x: 1 }]);
    expect(result.ir).toBe(ir);
  });
});
