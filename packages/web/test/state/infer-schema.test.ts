// PR AA — explicit cold-start inference.
//
// Schema inference no longer fires automatically when records arrive. The
// user reviews the imported records (and any inference-option overrides)
// then calls `inferSchema()` to commit. This catalog covers the store action.

import type { InferOptions, IR } from "@schemagen/core";
import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("inferSchema store action", () => {
  it("AA-S1: produces an IR from the current records", () => {
    useStore.getState().setRecords([{ id: "a" }, { id: "b" }]);
    useStore.getState().inferSchema();
    const ir = useStore.getState().ir;
    expect(ir?.kind).toBe("object");
  });

  // PR Z carried this case via ingestRecords; it now belongs here.
  it("AA-S2: respects inferenceOptions (maxCardinality=30 produces a 25-value literal union)", () => {
    const records = Array.from({ length: 100 }, (_, i) => ({ id: i, kind: `kind-${i % 25}` }));
    const options: InferOptions = { literals: { maxCardinality: 30 } };
    useStore.getState().setRecords(records);
    useStore.getState().setInferenceOptions(options);
    useStore.getState().inferSchema();
    const ir = useStore.getState().ir;
    expect(ir?.kind).toBe("object");
    if (ir?.kind === "object") {
      const kindField = ir.fields.kind?.type;
      expect(kindField?.kind).toBe("string");
      if (kindField?.kind === "string") {
        expect(kindField.literals).toHaveLength(25);
      }
    }
  });

  it("AA-S3: is a no-op when an IR already exists (the user owns it)", () => {
    const existing: IR = { kind: "object", fields: {}, additional: true };
    useStore.getState().setIR(existing);
    useStore.getState().setRecords([{ id: "a" }]);
    useStore.getState().inferSchema();
    expect(useStore.getState().ir).toBe(existing);
  });

  it("AA-S4: is a no-op when there are no records", () => {
    useStore.getState().inferSchema();
    expect(useStore.getState().ir).toBeNull();
  });
});
