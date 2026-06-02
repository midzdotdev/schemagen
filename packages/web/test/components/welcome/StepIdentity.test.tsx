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

// The picker pre-seeds with proposeIdentityKey, so the proposed field is
// already ticked when Step 2 mounts. Tests below either work with that
// default or untick it first to exercise the empty-selection path.

describe("StepIdentity", () => {
  // Plan § "Step 2 — Identity key" — inline IdentityPicker renders primitive fields
  it("HH-I1: inline picker renders the primitive fields", () => {
    render(<StepIdentity onContinue={() => {}} onBack={() => {}} onSkip={() => {}} />);
    expect(screen.getByRole("checkbox", { name: /\bid\b/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /\bname\b/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /\brole\b/ })).toBeInTheDocument();
  });

  // Live dedup preview — start with the proposal pre-selected, switch to a
  // different field, the preview should reflect the new tuple.
  it("HH-I2: dedup preview updates when the selected field changes", async () => {
    const user = userEvent.setup();
    render(<StepIdentity onContinue={() => {}} onBack={() => {}} onSkip={() => {}} />);
    // Some preview line is rendered initially (proposal seeded).
    expect(screen.getByRole("status")).toBeInTheDocument();
    // Untick all currently-selected checkboxes, then tick `id`.
    for (const cb of screen.getAllByRole("checkbox") as HTMLInputElement[]) {
      if (cb.checked) await user.click(cb);
    }
    await user.click(screen.getByRole("checkbox", { name: /\bid\b/ }));
    // id has 3 unique values across 4 records → 3 unique, 1 duplicate.
    expect(screen.getByText(/3 unique/i)).toBeInTheDocument();
    expect(screen.getByText(/1 duplicate/i)).toBeInTheDocument();
  });

  // No-selection language surfaces when the user unticks everything.
  it("HH-I3: dedup preview reads 'No identity key selected' after the user clears the seed", async () => {
    const user = userEvent.setup();
    render(<StepIdentity onContinue={() => {}} onBack={() => {}} onSkip={() => {}} />);
    for (const cb of screen.getAllByRole("checkbox") as HTMLInputElement[]) {
      if (cb.checked) await user.click(cb);
    }
    expect(screen.getByText(/no identity key selected/i)).toBeInTheDocument();
  });

  // Continue with the seeded proposal commits identityConfig and advances.
  it("HH-W6: Continue with the seeded proposal calls setIdentityConfig and onContinue", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<StepIdentity onContinue={onContinue} onBack={() => {}} onSkip={() => {}} />);
    await user.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(useStore.getState().identityConfig).not.toBeNull();
    expect(onContinue).toHaveBeenCalledOnce();
  });

  // Skip identity becomes available once the user unticks the seed.
  it("HH-W7: Skip identity advances without setting identity once the seed is cleared", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<StepIdentity onContinue={onContinue} onBack={() => {}} onSkip={() => {}} />);
    for (const cb of screen.getAllByRole("checkbox") as HTMLInputElement[]) {
      if (cb.checked) await user.click(cb);
    }
    await user.click(screen.getByRole("button", { name: /skip identity/i }));
    expect(useStore.getState().identityConfig).toBeNull();
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
