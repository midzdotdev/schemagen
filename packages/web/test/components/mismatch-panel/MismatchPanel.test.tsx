import type { IR } from "@schemagen/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { MismatchPanel } from "../../../src/components/mismatch-panel/MismatchPanel";
import { useStore } from "../../../src/state/store";

const ir: IR = {
  kind: "object",
  fields: {
    id: { type: { kind: "string" } },
    status: { type: { kind: "string", literals: ["active", "pending"] } },
  },
  additional: false,
};

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("MismatchPanel", () => {
  // Spec: docs/frontend-spec.md § "Mismatch panel"
  it("W5-MP1: empty state when no mismatches", () => {
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([{ id: "a", status: "active" }]);
    });
    render(<MismatchPanel />);
    expect(screen.getByText(/no mismatches/i)).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Mismatch panel"
  it("W5-MP2: lists each mismatch with its suggestions", () => {
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([
        { id: "a", status: "past_due" },
        { id: "b", status: "active", stripe_customer_id: "cus_1" },
      ]);
    });
    render(<MismatchPanel />);
    // literal-violation on status; unexpected-field on stripe_customer_id
    expect(screen.getByText(/literal violation/i)).toBeInTheDocument();
    expect(screen.getByText(/unexpected field/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add "past_due" to literals/i })).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Mismatch panel" — clicking a suggestion resolves
  it("W5-MP3: clicking a suggestion applies the change and removes the entry", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([{ id: "a", status: "past_due" }]);
    });
    render(<MismatchPanel />);
    await user.click(screen.getByRole("button", { name: /add "past_due" to literals/i }));
    await waitFor(() => {
      expect(screen.queryByText(/literal violation/i)).not.toBeInTheDocument();
    });
    // Confirm the IR was updated
    const status = (
      useStore.getState().ir as {
        fields: Record<string, { type: { literals?: string[] } }>;
      }
    ).fields.status;
    expect(status?.type.literals).toContain("past_due");
  });
});
