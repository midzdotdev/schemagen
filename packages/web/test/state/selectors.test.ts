import type { Mismatch } from "@schemagen/core";
import { describe, expect, it } from "vitest";
import {
  evidenceAtPath,
  formatPath,
  isPathPrefix,
  mismatchCountAtPath,
  pathsEqual,
} from "@/state/selectors";

describe("path helpers", () => {
  // Spec: docs/frontend-spec.md § "Schema tree"
  it("W3-SE1: isPathPrefix matches an empty prefix to anything", () => {
    expect(isPathPrefix([], ["a"])).toBe(true);
    expect(isPathPrefix([], [])).toBe(true);
  });

  // Spec: docs/frontend-spec.md § "Schema tree"
  it("W3-SE2: isPathPrefix rejects longer-than-candidate", () => {
    expect(isPathPrefix(["a", "b"], ["a"])).toBe(false);
  });

  // Spec: docs/frontend-spec.md § "Schema tree"
  it("W3-SE3: isPathPrefix is element-wise", () => {
    expect(isPathPrefix(["a", "b"], ["a", "b", "c"])).toBe(true);
    expect(isPathPrefix(["a", "x"], ["a", "b", "c"])).toBe(false);
  });

  // Spec: docs/frontend-spec.md § "Schema tree"
  it("W3-SE4: pathsEqual works for arrays and null", () => {
    expect(pathsEqual([], [])).toBe(true);
    expect(pathsEqual(["a"], ["a"])).toBe(true);
    expect(pathsEqual(null, null)).toBe(true);
    expect(pathsEqual(null, [])).toBe(false);
    expect(pathsEqual(["a"], ["b"])).toBe(false);
  });

  // Spec: docs/frontend-spec.md § "Schema tree"
  it("W3-SE5: formatPath renders human-readable paths", () => {
    expect(formatPath([])).toBe("(root)");
    expect(formatPath(["status"])).toBe("status");
    expect(formatPath(["address", "country"])).toBe("address.country");
    expect(formatPath(["tags", 0])).toBe("tags[0]");
  });
});

describe("mismatchCountAtPath", () => {
  const mismatches: Mismatch[] = [
    {
      path: ["status"],
      kind: "literal-violation",
      expected: "x",
      actual: { value: "y", description: "" },
      suggestions: [],
    },
    {
      path: ["address", "country"],
      kind: "type-mismatch",
      expected: "x",
      actual: { value: 1, description: "" },
      suggestions: [],
    },
    {
      path: ["address", "city"],
      kind: "missing-required-field",
      expected: "x",
      actual: { value: undefined, description: "" },
      suggestions: [],
    },
  ];

  // Spec: docs/frontend-spec.md § "Schema tree" — descendant aggregation
  it("W3-SE6: root path aggregates all mismatches", () => {
    expect(mismatchCountAtPath(mismatches, [])).toBe(3);
  });

  // Spec: docs/frontend-spec.md § "Schema tree" — descendant aggregation
  it("W3-SE7: intermediate path aggregates descendants", () => {
    expect(mismatchCountAtPath(mismatches, ["address"])).toBe(2);
  });

  // Spec: docs/frontend-spec.md § "Schema tree" — leaf path matches its own only
  it("W3-SE8: leaf path matches itself", () => {
    expect(mismatchCountAtPath(mismatches, ["status"])).toBe(1);
  });

  // Spec: docs/frontend-spec.md § "Schema tree"
  it("W3-SE9: paths with no matches return 0", () => {
    expect(mismatchCountAtPath(mismatches, ["other"])).toBe(0);
  });
});

describe("evidenceAtPath", () => {
  // Spec: docs/frontend-spec.md § "Schema tree" — inline evidence summaries
  it("W3-SE10: navigates an object field's value evidence", () => {
    const tree = {
      kind: "object" as const,
      count: 3,
      fields: {
        x: {
          presenceCount: 3,
          nullCount: 0,
          valueEvidence: {
            kind: "string" as const,
            count: 3,
            values: { a: 3 },
            cardinality: 1,
            sampleValues: ["a"],
          },
        },
      },
    };
    const result = evidenceAtPath(tree, ["x"]);
    expect(result?.kind).toBe("string");
    expect(result?.count).toBe(3);
  });

  // Spec: docs/frontend-spec.md § "Schema tree"
  it("W3-SE11: returns null when path doesn't resolve", () => {
    const tree = {
      kind: "object" as const,
      count: 1,
      fields: {},
    };
    expect(evidenceAtPath(tree, ["missing"])).toBeNull();
  });
});
