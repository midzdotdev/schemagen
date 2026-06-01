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
    expect(useStore.getState().identityConfig).toEqual({ fields: [["id"]] });
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

  // PR CC — button rename ("Clear" reads like "reset to default"; "Remove" is unambiguous).
  it("X2-D4 (CC): Remove identity key clears the current config", async () => {
    const user = userEvent.setup();
    seedRecords();
    act(() => {
      useStore.getState().setIdentityConfig({ fields: [["id"]] });
    });
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /remove identity key/i }));
    expect(useStore.getState().identityConfig).toBeNull();
  });

  // New: empty-state messaging when there are no records to compute stats over.
  it("D-EMPTY: shows guidance when no records are loaded", () => {
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/import some records first/i)).toBeInTheDocument();
  });

  // PR CC — non-primitive fields are filtered out of the picker (object/array
  // values don't make sense as identity keys; JSON.stringify of an object is
  // fragile and the user can't reason about composite ordering).
  it("CC-D1: picker omits object-typed fields", () => {
    act(() => {
      useStore.getState().setRecords([
        { id: "a", profile: { name: "x" } },
        { id: "b", profile: { name: "y" } },
      ]);
    });
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: /\bid\b/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /profile/ })).toBeNull();
  });

  it("CC-D2: picker omits array-typed and mixed-typed fields", () => {
    act(() => {
      useStore.getState().setRecords([
        { id: "a", tags: ["x"], mixed: 1 },
        { id: "b", tags: ["y"], mixed: "two" },
      ]);
    });
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    expect(screen.queryByRole("checkbox", { name: /tags/ })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /mixed/ })).toBeNull();
  });

  it("CC-D3: each picker row shows the field's kind chip", () => {
    act(() => {
      useStore.getState().setRecords([
        { id: "a", count: 1 },
        { id: "b", count: 2 },
      ]);
    });
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    // The id row labels itself with the kind ("string"); count labels itself "number".
    const idRow = screen.getByRole("checkbox", { name: /\bid\b/ }).closest("label");
    const countRow = screen.getByRole("checkbox", { name: /count/ }).closest("label");
    expect(idRow?.textContent).toMatch(/string/i);
    expect(countRow?.textContent).toMatch(/number/i);
  });
});
