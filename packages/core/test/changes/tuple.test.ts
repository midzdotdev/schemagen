import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { IR, TupleNode } from "../../src/ir/types";

describe("applyChange tuple ops", () => {
  // Spec: docs/core-spec.md § Change op `set-node`
  // Interpretation: tuples have no tuple-specific ops in the Change union;
  // edits go through `set-node` at the tuple's path (or at indexed positions).
  it("C_T1: tuple edits via set-node are invertible", () => {
    const ir: TupleNode = {
      kind: "tuple",
      items: [{ kind: "string" }, { kind: "number" }],
    };

    // Replace the whole tuple with a longer tuple via set-node at root.
    const replacement: TupleNode = {
      kind: "tuple",
      items: [{ kind: "string" }, { kind: "number" }, { kind: "boolean" }],
      rest: { kind: "string" },
    };
    const r1 = applyChange(ir as IR, {
      op: "set-node",
      path: [],
      node: replacement,
    });
    expect(r1.ir).toEqual(replacement);
    expect(applyChange(r1.ir, r1.inverse).ir).toEqual(ir);

    // Replace an indexed tuple element via set-node at the position path.
    const r2 = applyChange(ir as IR, {
      op: "set-node",
      path: [1],
      node: { kind: "boolean" },
    });
    expect((r2.ir as TupleNode).items[1]).toEqual({ kind: "boolean" });
    expect(applyChange(r2.ir, r2.inverse).ir).toEqual(ir);
  });
});
