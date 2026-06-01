// PR HH Phase 4 — Step 2 (Identity). See docs/plans/pr-hh-workspace-wizard.md.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StepIdentity } from "@/components/welcome/StepIdentity";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
  act(() => {
    useStore.getState().setRecords([
      { id: 1, name: "Alice", role: "admin" },
      { id: 2, name: "Bob", role: "user" },
      { id: 1, name: "Alice (updated)", role: "admin" },
      { id: 3, name: "Charlie", role: "user" },
    ]);
  });
});

describe("StepIdentity", () => {
  // Plan § "Step 2 — Identity key" — inline IdentityPicker renders primitive fields
  it("HH-I1: inline picker renders the primitive fields", () => {
    render(<StepIdentity onContinue={() => {}} onBack={() => {}} onSkip={() => {}} />);
    expect(screen.getByRole("checkbox", { name: /\bid\b/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /\bname\b/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /\brole\b/ })).toBeInTheDocument();
  });

  // Plan § "Step 2 — Identity key" — live dedup preview
  it("HH-I2: dedup preview updates when the selected field changes", async () => {
    const user = userEvent.setup();
    render(<StepIdentity onContinue={() => {}} onBack={() => {}} onSkip={() => {}} />);
    // No selection: every record is distinct.
    expect(screen.getByText(/no identity key selected/i)).toBeInTheDocument();
    // Selecting `id` collapses the two id=1 records into one.
    await user.click(screen.getByRole("checkbox", { name: /\bid\b/ }));
    expect(screen.getByText(/3 unique/i)).toBeInTheDocument();
    expect(screen.getByText(/1 duplicate/i)).toBeInTheDocument();
  });

  // Plan § "Step 2 — Identity key" — no-selection language
  it("HH-I3: dedup preview reads 'No identity key selected' when selection is empty", () => {
    render(<StepIdentity onContinue={() => {}} onBack={() => {}} onSkip={() => {}} />);
    expect(screen.getByText(/no identity key selected/i)).toBeInTheDocument();
  });

  // Plan § "Step 2 — Identity key" — Continue commits identityConfig + advances
  it("HH-W6: Continue with a selection calls setIdentityConfig and onContinue", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<StepIdentity onContinue={onContinue} onBack={() => {}} onSkip={() => {}} />);
    await user.click(screen.getByRole("checkbox", { name: /\bid\b/ }));
    await user.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(useStore.getState().identityConfig).toEqual({ fields: [["id"]] });
    expect(onContinue).toHaveBeenCalledOnce();
  });

  // Plan § "Step 2 — Identity key" — empty selection skips identity
  it("HH-W7: Continue with no selection advances without setting identity", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<StepIdentity onContinue={onContinue} onBack={() => {}} onSkip={() => {}} />);
    // The button label flips to "Skip identity" so the user understands.
    await user.click(screen.getByRole("button", { name: /skip identity/i }));
    expect(useStore.getState().identityConfig).toBeNull();
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
