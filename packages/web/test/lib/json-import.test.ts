import { describe, expect, it } from "vitest";
import { checkRoot, parseImport } from "../../src/lib/json-import";

describe("parseImport", () => {
  // Spec: docs/frontend-spec.md § "Importing records"
  it("W2-J1: parses a JSON array of objects", () => {
    const r = parseImport('[{"id":1},{"id":2}]');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.source).toBe("json");
    expect(r.value).toEqual([{ id: 1 }, { id: 2 }]);
  });

  // Spec: docs/frontend-spec.md § "Importing records"
  it("W2-J2: parses a JSON object", () => {
    const r = parseImport('{"data":[{"x":1}]}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ data: [{ x: 1 }] });
  });

  // Spec: docs/frontend-spec.md § "Importing records" — NDJSON
  it("W2-J3: parses NDJSON (newline-separated JSON lines)", () => {
    const r = parseImport('{"id":1}\n{"id":2}\n{"id":3}');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.source).toBe("ndjson");
    expect(r.value).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  // Spec: docs/frontend-spec.md § "Importing records"
  it("W2-J4: returns error on empty input", () => {
    const r = parseImport("   \n  ");
    expect(r.ok).toBe(false);
  });

  // Spec: docs/frontend-spec.md § "Importing records"
  it("W2-J5: returns error on malformed JSON", () => {
    const r = parseImport("{not valid");
    expect(r.ok).toBe(false);
  });
});

describe("checkRoot", () => {
  // Spec: docs/frontend-spec.md § "Importing records" — refuses primitives
  it("W2-R1: refuses primitives", () => {
    expect(checkRoot("hello")).toMatchObject({ ok: false });
    expect(checkRoot(42)).toMatchObject({ ok: false });
    expect(checkRoot(true)).toMatchObject({ ok: false });
    expect(checkRoot(null)).toMatchObject({ ok: false });
  });

  // Spec: docs/frontend-spec.md § "Importing records"
  it("W2-R2: refuses arrays of primitives", () => {
    expect(checkRoot([1, 2, 3])).toMatchObject({ ok: false });
    expect(checkRoot(["a", "b"])).toMatchObject({ ok: false });
  });

  // Spec: docs/frontend-spec.md § "Importing records" — array of objects: no picker
  it("W2-R3: pure array of objects -> no picker needed", () => {
    expect(checkRoot([{ a: 1 }, { b: 2 }])).toEqual({
      ok: true,
      needsPicker: false,
      isArray: true,
    });
  });

  // Spec: docs/frontend-spec.md § "Root picker"
  it("W2-R4: object root -> picker needed", () => {
    expect(checkRoot({ data: [{ x: 1 }] })).toEqual({
      ok: true,
      needsPicker: true,
      isArray: false,
    });
  });

  // Spec: docs/frontend-spec.md § "Root picker"
  it("W2-R5: array of mixed values -> picker needed", () => {
    expect(checkRoot([{ a: 1 }, "metadata", [{ b: 2 }]])).toEqual({
      ok: true,
      needsPicker: true,
      isArray: true,
    });
  });

  // Spec: docs/frontend-spec.md § "Importing records"
  it("W2-R6: empty array -> error", () => {
    expect(checkRoot([])).toMatchObject({ ok: false });
  });
});
