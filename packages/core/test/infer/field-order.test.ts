import { describe, expect, it } from "vitest";
import { infer } from "../../src/infer";
import type { ObjectNode } from "../../src/ir/types";

describe("field order preservation", () => {
  // Spec: docs/ir-spec.md § "Design properties" #3 + core-spec § "Field ordering"
  it("IFO1: a single sample's field order is preserved", () => {
    const ir = infer([{ z: 1, a: 2, m: 3 }]) as ObjectNode;
    expect(Object.keys(ir.fields)).toEqual(["z", "a", "m"]);
  });

  // Spec: docs/core-spec.md § "Field ordering"
  // — "stable: fields from earlier samples come before fields only seen in later samples"
  it("IFO2: later-introduced fields appear after earlier ones", () => {
    const samples = [
      { id: 1, name: "a" },
      { id: 2, name: "b", extra: 1 },
      { id: 3, name: "c", new_field: "x" },
    ];
    const ir = infer(samples) as ObjectNode;
    expect(Object.keys(ir.fields)).toEqual(["id", "name", "extra", "new_field"]);
  });

  // Spec: docs/core-spec.md § same (Interpretation flagged: position independent of presence freq)
  it("IFO3: presence frequency does not change field ordering", () => {
    // 'rare' shows up once but in the first sample; 'common' shows up everywhere
    // but only after 'rare' in the first sample.
    const samples = [{ rare: "x", common: 1 }, { common: 1 }, { common: 1 }, { common: 1 }];
    const ir = infer(samples) as ObjectNode;
    expect(Object.keys(ir.fields)).toEqual(["rare", "common"]);
  });
});
