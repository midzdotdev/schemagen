import { describe, expect, it } from "vitest";
import { computeEvidence } from "../../src/evidence";
import type { IR } from "../../src/ir/types";

describe("computeEvidence shape", () => {
  // Spec: docs/core-spec.md § "`computeEvidence`" — "Shape mirrors the IR's node tree"
  // Interpretation: For each IR node, the matching evidence node at the same
  // path should carry the same `kind`.
  it("E_SH1: evidence tree mirrors a nested IR's node tree", () => {
    const ir: IR = {
      kind: "object",
      fields: {
        id: { type: { kind: "string" } },
        age: { type: { kind: "number" } },
        active: { type: { kind: "boolean" } },
        tags: { type: { kind: "array", items: { kind: "string" } } },
        coord: {
          type: {
            kind: "tuple",
            items: [{ kind: "number" }, { kind: "number" }],
            rest: { kind: "number" },
          },
        },
        meta: { type: { kind: "record", values: { kind: "string" } } },
        either: {
          type: {
            kind: "union",
            variants: [{ kind: "string" }, { kind: "number" }],
          },
        },
        what: { type: { kind: "unknown" } },
        nothing: { type: { kind: "null" } },
      },
      additional: false,
    };

    const ev = computeEvidence(ir, []);
    expect(ev.kind).toBe("object");
    if (ev.kind !== "object") return;

    expect(ev.fields.id?.valueEvidence.kind).toBe("string");
    expect(ev.fields.age?.valueEvidence.kind).toBe("number");
    expect(ev.fields.active?.valueEvidence.kind).toBe("boolean");

    const tagsEv = ev.fields.tags?.valueEvidence;
    expect(tagsEv?.kind).toBe("array");
    if (tagsEv?.kind === "array") {
      expect(tagsEv.items.kind).toBe("string");
    }

    const coordEv = ev.fields.coord?.valueEvidence;
    expect(coordEv?.kind).toBe("tuple");
    if (coordEv?.kind === "tuple") {
      expect(coordEv.items).toHaveLength(2);
      expect(coordEv.items[0]?.kind).toBe("number");
      expect(coordEv.items[1]?.kind).toBe("number");
      expect(coordEv.rest?.kind).toBe("number");
    }

    const metaEv = ev.fields.meta?.valueEvidence;
    expect(metaEv?.kind).toBe("record");
    if (metaEv?.kind === "record") {
      expect(metaEv.values.kind).toBe("string");
    }

    const unionEv = ev.fields.either?.valueEvidence;
    expect(unionEv?.kind).toBe("union");
    if (unionEv?.kind === "union") {
      expect(unionEv.variants).toHaveLength(2);
      expect(unionEv.variants[0]?.kind).toBe("string");
      expect(unionEv.variants[1]?.kind).toBe("number");
    }

    expect(ev.fields.what?.valueEvidence.kind).toBe("unknown");
    expect(ev.fields.nothing?.valueEvidence.kind).toBe("null");
  });
});
