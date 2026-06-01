import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("identity store slices", () => {
  // Spec: docs/frontend-spec.md § "Identity-key suggestion"
  it("X2-S1: setIdentityProposal stores the proposal", () => {
    useStore.getState().setIdentityProposal({
      fields: [["id"]],
      confidence: { uniqueness: 1, presence: 1 },
      rationale: "id is unique in 100%",
    });
    expect(useStore.getState().identityProposal?.fields).toEqual([["id"]]);
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion"
  it("X2-S2: setIdentityConfig dedupes records under the config", () => {
    useStore.getState().setRecords([
      { id: 1, v: "first" },
      { id: 1, v: "second" },
      { id: 2, v: "x" },
    ]);
    const { droppedCount } = useStore.getState().setIdentityConfig({
      fields: [["id"]],
    });
    expect(droppedCount).toBe(1);
    expect(useStore.getState().records).toHaveLength(2);
    expect(useStore.getState().identityConfig).toEqual({
      fields: [["id"]],
    });
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion"
  it("X2-S3: setIdentityConfig(null) clears config without dedup", () => {
    useStore.getState().setIdentityConfig({ fields: [["id"]] });
    useStore.getState().setIdentityConfig(null);
    expect(useStore.getState().identityConfig).toBeNull();
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion" — dismissal persists per workspace
  it("X2-S4: dismissIdentitySuggestion sets the dismissed flag", () => {
    useStore.getState().dismissIdentitySuggestion();
    expect(useStore.getState().identityProposalDismissed).toBe(true);
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion" — newest per
  // identity wins (single dedup mode after dropping 'skip').
  it("X2-S5: dedup keeps the newest occurrence per identity", () => {
    useStore.getState().setRecords([
      { id: 1, v: "first" },
      { id: 1, v: "second" },
    ]);
    useStore.getState().setIdentityConfig({ fields: [["id"]] });
    expect(useStore.getState().records).toEqual([{ id: 1, v: "second" }]);
  });
});
