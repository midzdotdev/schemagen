import { beforeEach, describe, expect, it } from "vitest";
import { getClientId, resetClientIdForTests } from "@/persistence/client-id";

beforeEach(() => {
  resetClientIdForTests();
});

describe("getClientId", () => {
  // Spec: docs/frontend-spec.md § "Persistence" — sync-readiness clientId
  it("X1-CI1: returns the same id across repeated calls", () => {
    const a = getClientId();
    const b = getClientId();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  // Spec: docs/frontend-spec.md § "Persistence"
  it("X1-CI2: persisted in localStorage so it survives Dexie deletion", () => {
    const a = getClientId();
    expect(localStorage.getItem("schemagen.clientId")).toBe(a);
  });

  // Spec: docs/frontend-spec.md § "Persistence"
  it("X1-CI3: regenerates after reset (tests-only)", () => {
    const a = getClientId();
    resetClientIdForTests();
    const b = getClientId();
    expect(a).not.toBe(b);
  });
});
