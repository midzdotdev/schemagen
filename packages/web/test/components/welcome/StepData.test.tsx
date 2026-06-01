// PR HH Phase 3 — Step 1 (Your data). See docs/plans/pr-hh-workspace-wizard.md.

import { render, screen } from "@testing-library/react";
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

  // Re-pick root affordance — only when the original parse had multiple
  // candidate root paths (e.g. nested objects with arrays at several levels).
  it("HH-D4: 'Pick a different root' is hidden when pendingImport has 0 or 1 candidates", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
      useStore.getState().setPendingImport({
        parsed: [{ id: 1 }],
        candidates: [{ path: [], recordCount: 1, preview: { id: 1 } }],
      });
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.queryByRole("button", { name: /pick a different root/i })).toBeNull();
  });

  it("HH-D5: 'Pick a different root' surfaces when pendingImport has 2+ candidates", () => {
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
    expect(screen.getByRole("button", { name: /pick a different root/i })).toBeInTheDocument();
  });
});
