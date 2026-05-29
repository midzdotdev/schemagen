import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { IdentityConfigDialog } from "../../../src/components/identity/IdentityConfigDialog";
import { useStore } from "../../../src/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("IdentityConfigDialog", () => {
  // Spec: docs/frontend-spec.md § "Identity-key suggestion" — settings dialog
  it("X2-D1: applies a single-field identity config", async () => {
    const user = userEvent.setup();
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByLabelText(/identity fields/i));
    await user.paste("id");
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    expect(useStore.getState().identityConfig).toEqual({
      fields: [["id"]],
      onDuplicate: "replace",
    });
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion" — composite key
  it("X2-D2: supports composite fields with dot notation", async () => {
    const user = userEvent.setup();
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByLabelText(/identity fields/i));
    await user.paste("order.id, lineId");
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    expect(useStore.getState().identityConfig?.fields).toEqual([["order", "id"], ["lineId"]]);
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion" — replace vs keep-all
  it("X2-D3: switching to keep-all is applied", async () => {
    const user = userEvent.setup();
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByLabelText(/identity fields/i));
    await user.paste("id");
    await user.click(screen.getByLabelText(/keep all/i));
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    expect(useStore.getState().identityConfig?.onDuplicate).toBe("keep-all");
  });

  // Spec: docs/frontend-spec.md § "Identity-key suggestion"
  it("X2-D4: Clear identity removes the current config", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIdentityConfig({ fields: [["id"]], onDuplicate: "replace" });
    });
    render(<IdentityConfigDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /clear identity/i }));
    expect(useStore.getState().identityConfig).toBeNull();
  });
});
