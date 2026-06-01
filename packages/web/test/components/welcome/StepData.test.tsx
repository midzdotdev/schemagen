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

  // Plan § "Resolved interpretations #2" — first record collapsed by default
  it("HH-D2: first-record <details> element is closed by default", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1, title: "Hi" }]);
    });
    render(<StepData onContinue={() => {}} />);
    const details = screen.getByText(/show first record/i).closest("details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
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
    expect(screen.getByText(/4 primitive fields/i)).toBeInTheDocument();
    expect(screen.getByText(/1 compound/i)).toBeInTheDocument();
  });

  // The field breakdown is skipped when records aren't object-shaped — there
  // are no fields to count. Top-level shape line still renders.
  it("HH-D3b: omits field breakdown for non-object records", () => {
    act(() => {
      useStore.getState().setRecords(["one", "two", "three"]);
    });
    render(<StepData onContinue={() => {}} />);
    expect(screen.getByText(/array of 3 strings/i)).toBeInTheDocument();
    expect(screen.queryByText(/primitive fields/i)).toBeNull();
  });
});
