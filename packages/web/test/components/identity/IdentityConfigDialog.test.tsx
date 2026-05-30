import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { IdentityConfigDialog } from "@/components/identity/IdentityConfigDialog";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

function seedRecords() {
  act(() => {
    useStore.getState().setRecords([
      { id: "a", status: "active", lineId: "x" },
      { id: "b", status: "active", lineId: "y" },
      { id: "c", status: "pending", lineId: "z" },
    ]);
  });
}

describe("IdentityConfigDialog", () => {
  // Spec: docs/frontend-spec.md § "Identity-key suggestion" — settings dialog
  // Interpretation: text input replaced with chip picker over actual record
  // fields. Selection is by clicking the option for that field.
  it("X2-D1: applies a single-field identity config", async () => {
    const user = userEvent.setup();
    seedRecords();
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("checkbox", { name: /\bid\b/ }));
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    expect(useStore.getState().identityConfig).toEqual({
      fields: [["id"]],
      onDuplicate: "replace",
    });
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion" — composite key
  // Interpretation: composite keys are now built by selecting multiple options.
  // Dot-notation nested paths aren't surfaced by the picker since the propose
  // scope is top-level; that's a deliberate scope match with core.
  it("X2-D2: supports composite keys from multiple selections", async () => {
    const user = userEvent.setup();
    seedRecords();
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("checkbox", { name: /\bstatus\b/ }));
    await user.click(screen.getByRole("checkbox", { name: /\blineId\b/ }));
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    const fields = useStore.getState().identityConfig?.fields;
    // Selection order isn't load-bearing; what matters is which fields are in.
    expect(fields?.length).toBe(2);
    expect(fields?.flat().sort()).toEqual(["lineId", "status"]);
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion" — replace vs keep-all
  it("X2-D3: switching to keep-all is applied", async () => {
    const user = userEvent.setup();
    seedRecords();
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("checkbox", { name: /\bid\b/ }));
    await user.click(screen.getByLabelText(/keep all/i));
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    expect(useStore.getState().identityConfig?.onDuplicate).toBe("keep-all");
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion"
  it("X2-D4: Clear identity removes the current config", async () => {
    const user = userEvent.setup();
    seedRecords();
    act(() => {
      useStore.getState().setIdentityConfig({ fields: [["id"]], onDuplicate: "replace" });
    });
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /clear identity/i }));
    expect(useStore.getState().identityConfig).toBeNull();
  });

  // New: empty-state messaging when there are no records to compute stats over.
  it("D-EMPTY: shows guidance when no records are loaded", () => {
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/import some records first/i)).toBeInTheDocument();
  });
});
