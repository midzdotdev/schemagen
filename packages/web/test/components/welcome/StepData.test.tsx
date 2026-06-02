// PR HH Phase 3 — Step 1 (Your data). See docs/plans/pr-hh-workspace-wizard.md.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { StepData } from "@/components/welcome/StepData";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("StepData", () => {
  // Plan § "Step 1 — Your data" — record count only (shape/field stats dropped
  // per user feedback; signal-to-noise wasn't worth the clutter).
  it("HH-D1: renders the record count", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
    });
    render(<StepData onContinue={() => {}} />);
    // The count + label render across two spans inside one <p> — a function
    // matcher reads the combined text content.
    expect(
      screen.getByText((_content, el) => el?.textContent === "5 records imported."),
    ).toBeInTheDocument();
  });

  // First record is shown unconditionally with a height cap + scroll —
  // users have asked for it always-visible to skip the click.
  it("HH-D2: sample record is rendered (height-capped, scrollable)", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1, title: "Hi" }]);
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.getByText(/^sample record$/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /sample record/i })).toBeInTheDocument();
  });

  // Records-root summary card — always visible when pendingImport exists,
  // shows the current root path + record count. Tree only opens via modal.
  it("HH-D4: root summary hidden when pendingImport is null (fallback line shown)", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.queryByText(/^records root$/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /change root/i })).toBeNull();
  });

  it("HH-D5a: root summary surfaces the selected path + count for single-candidate import", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
      useStore.getState().setPendingImport({
        parsed: [{ id: 1 }],
        candidates: [{ path: [], recordCount: 1, preview: { id: 1 } }],
      });
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.getByText(/^records root$/i)).toBeInTheDocument();
    expect(screen.getByText(/\(root\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1 record/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change root/i })).toBeInTheDocument();
  });

  it("HH-D5b: root summary surfaces the selected sub-path for nested imports", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
      useStore.getState().setPendingImport({
        parsed: { items: [{ id: 1 }], extras: [{ name: "x" }] },
        candidates: [
          { path: ["items"], recordCount: 1, preview: { id: 1 } },
          { path: ["extras"], recordCount: 1, preview: { name: "x" } },
        ],
      });
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.getByText(/^items$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change root/i })).toBeInTheDocument();
  });

  it("HH-D6: clicking 'Change root…' opens the RootPickerModal with the tree", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
      useStore.getState().setPendingImport({
        parsed: { items: [{ id: 1 }], extras: [{ name: "x" }] },
        candidates: [
          { path: ["items"], recordCount: 1, preview: { id: 1 } },
          { path: ["extras"], recordCount: 1, preview: { name: "x" } },
        ],
      });
    });
    render(<StepData onContinue={() => {}} />);
    await user.click(screen.getByRole("button", { name: /change root/i }));
    expect(screen.getByRole("dialog", { name: /pick the records path/i })).toBeInTheDocument();
  });
});
