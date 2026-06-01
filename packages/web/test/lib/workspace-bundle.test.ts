import { describe, expect, it } from "vitest";
import {
  buildWorkspaceBundle,
  bundleSizeBytes,
  parseWorkspaceBundle,
  type WorkspaceBundle,
} from "@/lib/workspace-bundle";

const baseBundle = (over: Partial<WorkspaceBundle> = {}): WorkspaceBundle => ({
  version: 1,
  exportedAt: 1000,
  originClientId: "client-x",
  workspaceName: "demo",
  ir: { kind: "object", fields: {}, additional: false },
  records: [{ id: 1 }],
  history: [],
  identityConfig: null,
  ...over,
});

describe("workspace bundle round-trip", () => {
  // Spec: docs/frontend-spec.md § "Export panel" — full workspace bundle
  it("X4-SB1: buildWorkspaceBundle produces the expected shape", () => {
    const bundle = buildWorkspaceBundle({
      workspaceName: "demo",
      originClientId: "client-x",
      ir: { kind: "object", fields: {}, additional: false },
      records: [{ id: 1 }],
      history: [],
      identityConfig: null,
      exportedAt: 1000,
    });
    expect(bundle.version).toBe(1);
    expect(bundle.exportedAt).toBe(1000);
    expect(bundle.workspaceName).toBe("demo");
    expect(bundle.originClientId).toBe("client-x");
  });

  // Spec: same — round-trip through JSON
  it("X4-SB2: parseWorkspaceBundle accepts a valid bundle", () => {
    const bundle = baseBundle();
    const result = parseWorkspaceBundle(JSON.parse(JSON.stringify(bundle)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bundle.records).toEqual([{ id: 1 }]);
    }
  });

  // Spec: same — version mismatch
  it("X4-SB3: parseWorkspaceBundle rejects an unsupported version", () => {
    const result = parseWorkspaceBundle({ ...baseBundle(), version: 99 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/version/);
  });

  // Spec: same — malformed input
  it("X4-SB4: parseWorkspaceBundle rejects missing required fields", () => {
    const result = parseWorkspaceBundle({ version: 1 });
    expect(result.ok).toBe(false);
  });

  // Spec: same — invalid root
  it("X4-SB5: parseWorkspaceBundle rejects non-object input", () => {
    expect(parseWorkspaceBundle(null).ok).toBe(false);
    expect(parseWorkspaceBundle([1, 2, 3]).ok).toBe(false);
    expect(parseWorkspaceBundle("string").ok).toBe(false);
  });

  // Spec: docs/frontend-spec.md § "Export panel" — file size estimate
  it("X4-SB6: bundleSizeBytes returns a positive byte count", () => {
    expect(bundleSizeBytes(baseBundle())).toBeGreaterThan(0);
  });
});
