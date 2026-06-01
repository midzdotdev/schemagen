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
  // Plan § "Step 1 — Your data" — record count + top-level shape stat card
  it("HH-D1: renders the record count and top-level shape", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.getByText(/5 records/i)).toBeInTheDocument();
    // Shape line names the top-level container shape.
    expect(screen.getByText(/array of 5 objects/i)).toBeInTheDocument();
  });

  // First record is shown unconditionally with a height cap + scroll —
  // users have asked for it always-visible to skip the click.
  it("HH-D2: first record is rendered (height-capped, scrollable)", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1, title: "Hi" }]);
    });
    render(<StepData onContinue={() => {}} />);
    // Label + JsonView region both present.
    expect(screen.getByText(/^first record$/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /first record/i })).toBeInTheDocument();
  });

  // Plan § "Step 1 — Your data" — field-stats peek
  it("HH-D3: primitive/compound field count matches computeFieldStats", () => {
    act(() => {
      useStore.getState().setRecords([
        // 4 primitive fields (id, name, active, score), 1 compound (profile)
        { id: 1, name: "Alice", active: true, score: 42, profile: { age: 30 } },
        { id: 2, name: "Bob", active: false, score: 51, profile: { age: 25 } },
      ]);
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.getByText(/^simple fields$/i)).toBeInTheDocument();
    expect(screen.getByText(/^4 \(string, number, boolean\)$/i)).toBeInTheDocument();
    expect(screen.getByText(/^nested fields$/i)).toBeInTheDocument();
    expect(screen.getByText(/^1 \(object, array\)$/i)).toBeInTheDocument();
  });

  // The field breakdown is skipped when records aren't object-shaped — there
  // are no fields to count. Top-level shape line still renders.
  it("HH-D3b: omits field breakdown for non-object records", () => {
    act(() => {
      useStore.getState().setRecords(["one", "two", "three"]);
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.getByText(/array of 3 strings/i)).toBeInTheDocument();
    expect(screen.queryByText(/simple fields/i)).toBeNull();
    expect(screen.queryByText(/nested fields/i)).toBeNull();
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
