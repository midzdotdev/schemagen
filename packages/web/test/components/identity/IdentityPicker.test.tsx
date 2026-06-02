// IdentityPicker — the composite-uniqueness readout must reserve its space so
// toggling between a single and a composite key doesn't shift the field list.

import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { IdentityPicker } from "@/components/identity/IdentityPicker";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
  act(() => {
    useStore.getState().setRecords([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
  });
});

describe("IdentityPicker composite-uniqueness readout", () => {
  it("reserves the line (present but hidden) with a single field selected", () => {
    render(<IdentityPicker selected={["id"]} onSelectedChange={() => {}} />);
    const line = screen.getByText(/composite uniqueness/i);
    expect(line).toBeInTheDocument();
    expect(line).toHaveClass("invisible");
    expect(line).toHaveAttribute("aria-hidden", "true");
  });

  it("shows the line once two or more fields are selected", () => {
    render(<IdentityPicker selected={["id", "name"]} onSelectedChange={() => {}} />);
    const line = screen.getByText(/composite uniqueness/i);
    expect(line).not.toHaveClass("invisible");
    expect(line).not.toHaveAttribute("aria-hidden");
  });
});
