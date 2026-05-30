import type { IR } from "@schemagen/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { MismatchPanel } from "@/components/mismatch-panel/MismatchPanel";
import { useStore } from "@/state/store";

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
    // Interpretation: empty-state copy now says "All records are valid".
    expect(screen.getByText(/all records are valid/i)).toBeInTheDocument();
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
    // Interpretation: kind badges were tightened to short labels ("literal" for
    // literal-violation, "extra" for unexpected-field). Both badges + the
    // matching filter chips appear; assert each is present at least once.
    expect(screen.getAllByText(/literal/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/extra/i).length).toBeGreaterThan(0);
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
      expect(screen.queryByText(/literal/i)).not.toBeInTheDocument();
    });
    // Confirm the IR was updated
    const status = (
      useStore.getState().ir as {
        fields: Record<string, { type: { literals?: string[] } }>;
      }
    ).fields.status;
    expect(status?.type.literals).toContain("past_due");
  });

  // PR I — filtering by kind
  it("W5-MP4: clicking a kind chip filters entries to that kind", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([
        { id: "a", status: "past_due" }, // literal-violation
        { id: "b", status: "active", x: 1 }, // unexpected-field
      ]);
    });
    render(<MismatchPanel />);
    // Pre-filter: both literal and extra badges present.
    expect(screen.getAllByText(/^literal$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^extra$/i).length).toBeGreaterThan(0);
    // Click the EXTRA chip.
    await user.click(screen.getByRole("button", { name: /^extra 1$/i }));
    await waitFor(() => {
      // After filter, the suggestion button for the literal-violation is gone.
      expect(
        screen.queryByRole("button", { name: /add "past_due" to literals/i }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText(/1 of 2/i)).toBeInTheDocument();
    // 'clear filter' restores everything.
    await user.click(screen.getByRole("button", { name: /clear filter/i }));
    expect(screen.queryByText(/clear filter/i)).not.toBeInTheDocument();
  });

  // PR I — collapsing a group hides its entries but keeps the header
  it("W5-MP5: clicking the group header toggles its entries", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([{ id: "a", status: "past_due" }]);
    });
    render(<MismatchPanel />);
    expect(screen.getByRole("button", { name: /add "past_due" to literals/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /status/i, expanded: true }));
    expect(
      screen.queryByRole("button", { name: /add "past_due" to literals/i }),
    ).not.toBeInTheDocument();
  });
});
