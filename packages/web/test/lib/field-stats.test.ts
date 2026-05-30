import { describe, expect, it } from "vitest";
import { compositeUniqueness, computeFieldStats } from "@/lib/field-stats";

describe("computeFieldStats", () => {
  it("returns empty for empty input", () => {
    expect(computeFieldStats([])).toEqual([]);
  });

  it("computes presence + uniqueness for each top-level field", () => {
    const records = [
      { id: 1, status: "active", note: "x" },
      { id: 2, status: "active" },
      { id: 3, status: "pending", note: "x" },
    ];
    const stats = computeFieldStats(records);
    const byName = Object.fromEntries(stats.map((s) => [s.name, s]));
    expect(byName.id?.uniqueness).toBeCloseTo(1);
    expect(byName.id?.presence).toBeCloseTo(1);
    expect(byName.status?.uniqueness).toBeCloseTo(1 / 3);
    expect(byName.note?.presence).toBeCloseTo(2 / 3);
  });

  it("sorts identity candidates first (uniqueness × presence descending)", () => {
    const records = [
      { id: "a", status: "x" },
      { id: "b", status: "x" },
      { id: "c", status: "y" },
    ];
    const stats = computeFieldStats(records);
    expect(stats[0]?.name).toBe("id");
  });

  it("ignores null and undefined when computing presence", () => {
    const records = [{ x: 1 }, { x: null }, { x: undefined }, {}];
    const stats = computeFieldStats(records);
    expect(stats.find((s) => s.name === "x")?.presence).toBeCloseTo(1 / 4);
  });
});

describe("compositeUniqueness", () => {
  it("is 1 when (a,b) tuple is unique per row even if neither is alone", () => {
    const records = [
      { a: 1, b: "x" },
      { a: 1, b: "y" },
      { a: 2, b: "x" },
      { a: 2, b: "y" },
    ];
    expect(compositeUniqueness(records, ["a", "b"])).toBeCloseTo(1);
    expect(compositeUniqueness(records, ["a"])).toBeCloseTo(0);
  });

  it("is 0 for empty inputs", () => {
    expect(compositeUniqueness([], ["a"])).toBe(0);
    expect(compositeUniqueness([{ a: 1 }], [])).toBe(0);
  });
});
