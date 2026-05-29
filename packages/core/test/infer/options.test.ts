import { describe, expect, it } from "vitest";
import { resolveOptions } from "../../src/infer/options";

describe("InferOptions defaults", () => {
  // Spec: docs/core-spec.md § "`infer`" — type block (literals)
  it("IO1: literals defaults", () => {
    const r = resolveOptions(undefined);
    expect(r.literals).toEqual({
      enable: true,
      maxCardinality: 20,
      maxUniqueRatio: 0.3,
      minSamples: 5,
    });
  });

  // Spec: docs/core-spec.md § "`infer`" — type block (discriminators)
  it("IO2: discriminators defaults", () => {
    const r = resolveOptions(undefined);
    expect(r.discriminators.enable).toBe(true);
    expect(r.discriminators.fields).toBeUndefined();
  });

  // Spec: docs/core-spec.md § "`infer`" — type block (formats)
  it("IO3: formats defaults", () => {
    const r = resolveOptions(undefined);
    expect(r.formats.enable).toBe(true);
    expect(r.formats.detect).toBe("all");
  });

  // Spec: docs/core-spec.md § "`infer`" — type block (numbers)
  it("IO4: numbers defaults", () => {
    const r = resolveOptions(undefined);
    expect(r.numbers).toEqual({ integerDetection: true, rangeMode: "evidence-only" });
  });

  // Spec: docs/core-spec.md § "`infer`" — type block (objects)
  it("IO5: objects defaults", () => {
    const r = resolveOptions(undefined);
    expect(r.objects).toEqual({ closed: true, optionalThreshold: 1.0 });
  });

  // Spec: docs/core-spec.md § "`infer`" — type block (onTypeConflict)
  it("IO6: onTypeConflict default", () => {
    expect(resolveOptions(undefined).onTypeConflict).toBe("union");
  });

  // Spec: docs/core-spec.md § "`infer`" (standard opt-bag pattern)
  it("IO7: partial options merge with defaults", () => {
    const r = resolveOptions({ literals: { maxCardinality: 5 }, onTypeConflict: "unknown" });
    expect(r.literals.maxCardinality).toBe(5);
    expect(r.literals.minSamples).toBe(5);
    expect(r.literals.enable).toBe(true);
    expect(r.onTypeConflict).toBe("unknown");
    expect(r.numbers.integerDetection).toBe(true);
  });
});
