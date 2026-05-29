import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { IdentitySuggestion } from "../../../src/components/identity/IdentitySuggestion";
import { useStore } from "../../../src/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

function seedProposal(): void {
  useStore.getState().setIdentityProposal({
    fields: [["id"]],
    confidence: { uniqueness: 1, presence: 1 },
    rationale: "Field 'id' is unique in 100% of records and present in 100%",
  });
}

describe("IdentitySuggestion", () => {
  // Spec: docs/frontend-spec.md § "Identity-key suggestion"
  it("X2-B1: renders nothing without a proposal", () => {
    render(<IdentitySuggestion />);
    expect(screen.queryByLabelText(/identity-key suggestion/i)).not.toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion"
  it("X2-B2: renders the banner when a proposal exists and is not dismissed", () => {
    act(() => seedProposal());
    render(<IdentitySuggestion />);
    expect(screen.getByLabelText(/identity-key suggestion/i)).toBeInTheDocument();
    expect(screen.getByText(/Field 'id' is unique/i)).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion"
  it("X2-B3: 'Use id' applies the proposal as identity config", async () => {
    const user = userEvent.setup();
    act(() => seedProposal());
    render(<IdentitySuggestion />);
    await user.click(screen.getByRole("button", { name: /^use id$/i }));
    expect(useStore.getState().identityConfig).toEqual({
      fields: [["id"]],
      onDuplicate: "replace",
    });
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion"
  it("X2-B4: 'Not now' dismisses the banner", async () => {
    const user = userEvent.setup();
    act(() => seedProposal());
    render(<IdentitySuggestion />);
    await user.click(screen.getByRole("button", { name: /not now/i }));
    expect(useStore.getState().identityProposalDismissed).toBe(true);
    expect(screen.queryByLabelText(/identity-key suggestion/i)).not.toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion"
  it("X2-B5: hides once an identity config is set", () => {
    act(() => {
      seedProposal();
      useStore.getState().setIdentityConfig({ fields: [["id"]], onDuplicate: "replace" });
    });
    render(<IdentitySuggestion />);
    expect(screen.queryByLabelText(/identity-key suggestion/i)).not.toBeInTheDocument();
  });
});
