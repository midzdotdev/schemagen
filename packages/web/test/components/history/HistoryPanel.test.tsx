import type { Change, IR } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { HistoryPanel } from "../../../src/components/history/HistoryPanel";
import { useStore } from "../../../src/state/store";

const ir: IR = {
  kind: "object",
  fields: { name: { type: { kind: "string" } } },
  additional: false,
};

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("HistoryPanel", () => {
  // Spec: docs/frontend-spec.md § "History"
  it("W6-HP1: empty history state", () => {
    render(<HistoryPanel />);
    expect(screen.getByText(/no history yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
  });

  // Spec: docs/frontend-spec.md § "History" — entries listed in order
  it("W6-HP2: lists applied changes with labels", () => {
    act(() => {
      useStore.getState().setIR(ir);
      const change: Change = { op: "set-optional", path: [], name: "name", value: true };
      useStore.getState().applyChange(change);
    });
    render(<HistoryPanel />);
    expect(screen.getByText(/mark 'name' optional/i)).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "History" — undo + redo
  it("W6-HP3: undo button reverses the latest change", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      const change: Change = { op: "set-optional", path: [], name: "name", value: true };
      useStore.getState().applyChange(change);
    });
    render(<HistoryPanel />);
    await user.click(screen.getByRole("button", { name: /undo/i }));
    expect(useStore.getState().history.cursor).toBe(0);
  });

  // Spec: docs/frontend-spec.md § "History" — redo reapplies
  it("W6-HP4: redo button reapplies an undone change", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      const change: Change = { op: "set-optional", path: [], name: "name", value: true };
      useStore.getState().applyChange(change);
      useStore.getState().undo();
    });
    render(<HistoryPanel />);
    await user.click(screen.getByRole("button", { name: /redo/i }));
    expect(useStore.getState().history.cursor).toBe(1);
  });
});
