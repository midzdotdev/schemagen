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

  // Records root tree — rendered whenever pendingImport has any candidates
  // (even a single one), so the user can see the structure of what was
  // imported. Hidden only when pendingImport is null or has zero candidates.
  it("HH-D4: tree picker hidden when pendingImport is null", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.queryByRole("list", { name: /json tree/i })).toBeNull();
    expect(screen.queryByText(/records root/i)).toBeNull();
  });

  it("HH-D5a: tree picker renders inline for a single-candidate import", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
      useStore.getState().setPendingImport({
        parsed: [{ id: 1 }],
        candidates: [{ path: [], recordCount: 1, preview: { id: 1 } }],
      });
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.getByRole("list", { name: /json tree/i })).toBeInTheDocument();
    expect(screen.getByText(/only one array of objects found/i)).toBeInTheDocument();
  });

  it("HH-D5b: tree picker renders inline when pendingImport has 2+ candidates", () => {
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
    expect(screen.getByRole("list", { name: /json tree/i })).toBeInTheDocument();
    expect(screen.getByText(/2 candidate arrays/i)).toBeInTheDocument();
  });
});
