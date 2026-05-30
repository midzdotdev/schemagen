import { describe, expect, it } from "vitest";
import { canonicalHash } from "@/lib/canonical-hash";

describe("canonicalHash", () => {
  // Spec: docs/frontend-spec.md § "Deduplication" — same record => same hash
  it("W2-H1: identical objects hash equal", () => {
    expect(canonicalHash({ a: 1, b: 2 })).toBe(canonicalHash({ a: 1, b: 2 }));
  });

  // Spec: docs/frontend-spec.md § "Deduplication"
  it("W2-H2: key insertion order does not affect the hash", () => {
    expect(canonicalHash({ a: 1, b: 2 })).toBe(canonicalHash({ b: 2, a: 1 }));
  });

  // Spec: docs/frontend-spec.md § "Deduplication"
  it("W2-H3: different values produce different hashes", () => {
    expect(canonicalHash({ a: 1 })).not.toBe(canonicalHash({ a: 2 }));
  });

  // Spec: docs/frontend-spec.md § "Deduplication"
  it("W2-H4: nested objects are key-sorted recursively", () => {
    expect(canonicalHash({ outer: { a: 1, b: 2 } })).toBe(canonicalHash({ outer: { b: 2, a: 1 } }));
  });
});
