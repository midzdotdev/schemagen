import { describe, expect, it } from "vitest";
import {
  buildSessionBundle,
  bundleSizeBytes,
  parseSessionBundle,
  type SessionBundle,
} from "@/lib/session-bundle";

const baseBundle = (over: Partial<SessionBundle> = {}): SessionBundle => ({
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

describe("session bundle round-trip", () => {
  // Spec: docs/frontend-spec.md § "Export panel" — full session bundle
  it("X4-SB1: buildSessionBundle produces the expected shape", () => {
    const bundle = buildSessionBundle({
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
  it("X4-SB2: parseSessionBundle accepts a valid bundle", () => {
    const bundle = baseBundle();
    const result = parseSessionBundle(JSON.parse(JSON.stringify(bundle)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bundle.records).toEqual([{ id: 1 }]);
    }
  });

  // Spec: same — version mismatch
  it("X4-SB3: parseSessionBundle rejects an unsupported version", () => {
    const result = parseSessionBundle({ ...baseBundle(), version: 99 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/version/);
  });

  // Spec: same — malformed input
  it("X4-SB4: parseSessionBundle rejects missing required fields", () => {
    const result = parseSessionBundle({ version: 1 });
    expect(result.ok).toBe(false);
  });

  // Spec: same — invalid root
  it("X4-SB5: parseSessionBundle rejects non-object input", () => {
    expect(parseSessionBundle(null).ok).toBe(false);
    expect(parseSessionBundle([1, 2, 3]).ok).toBe(false);
    expect(parseSessionBundle("string").ok).toBe(false);
  });

  // Spec: docs/frontend-spec.md § "Export panel" — file size estimate
  it("X4-SB6: bundleSizeBytes returns a positive byte count", () => {
    expect(bundleSizeBytes(baseBundle())).toBeGreaterThan(0);
  });
});
