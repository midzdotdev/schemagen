import { describe, expect, it } from "vitest";
import { enumerateCandidates, formatPath, getAtPath } from "../../src/lib/root-picker";

describe("enumerateCandidates", () => {
  // Spec: docs/frontend-spec.md § "Root picker"
  it("W2-P1: object with one array of objects", () => {
    const v = { users: [{ id: 1 }, { id: 2 }] };
    const out = enumerateCandidates(v);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ path: ["users"], recordCount: 2 });
  });

  // Spec: docs/frontend-spec.md § "Root picker"
  it("W2-P2: object with multiple arrays of objects", () => {
    const v = { users: [{ a: 1 }], orders: [{ b: 1 }, { b: 2 }] };
    const out = enumerateCandidates(v);
    const paths = out.map((c) => c.path);
    expect(paths).toContainEqual(["users"]);
    expect(paths).toContainEqual(["orders"]);
  });

  // Spec: docs/frontend-spec.md § "Root picker"
  it("W2-P3: deeply nested array of objects", () => {
    const v = { data: { items: [{ x: 1 }] } };
    const out = enumerateCandidates(v);
    expect(out.map((c) => c.path)).toContainEqual(["data", "items"]);
  });

  // Spec: docs/frontend-spec.md § "Root picker"
  // — array indices in paths ("strangely formatted JSON may have the dataset at index 2")
  it("W2-P4: array of mixed values surfaces the array-of-objects element by index", () => {
    const v = ["metadata", "more metadata", [{ record: 1 }, { record: 2 }]];
    const out = enumerateCandidates(v);
    const paths = out.map((c) => c.path);
    expect(paths).toContainEqual([2]);
  });

  // Spec: docs/frontend-spec.md § "Root picker"
  it("W2-P5: returns empty when no array of objects exists", () => {
    expect(enumerateCandidates({ a: 1, b: "x" })).toEqual([]);
  });

  // Spec: docs/frontend-spec.md § "Root picker" — preview is the first record
  it("W2-P6: preview is the first record in the array", () => {
    const out = enumerateCandidates({ data: [{ id: "first" }, { id: "second" }] });
    expect(out[0]?.preview).toEqual({ id: "first" });
  });
});

describe("getAtPath / formatPath", () => {
  it("W2-P7: getAtPath navigates by mixed path", () => {
    const v = { a: { b: [{ c: 42 }] } };
    expect(getAtPath(v, ["a", "b", 0, "c"])).toBe(42);
  });

  it("W2-P8: formatPath renders object keys + array indices", () => {
    expect(formatPath([])).toBe("(root)");
    expect(formatPath(["users"])).toBe("users");
    expect(formatPath(["data", "items"])).toBe("data.items");
    expect(formatPath([2])).toBe("[2]");
    expect(formatPath(["batches", 0, "rows"])).toBe("batches[0].rows");
  });
});
