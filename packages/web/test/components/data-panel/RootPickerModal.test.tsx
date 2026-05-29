import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RootPickerModal } from "../../../src/components/data-panel/RootPickerModal";
import type { PickerCandidate } from "../../../src/lib/root-picker";

const candidates: PickerCandidate[] = [
  { path: ["users"], recordCount: 200, preview: { id: 1 } },
  { path: ["data", "items"], recordCount: 5, preview: { x: "y" } },
];

describe("RootPickerModal", () => {
  // Spec: docs/frontend-spec.md § "Root picker"
  it("W2-PM1: lists every candidate with path + record count", () => {
    render(
      <RootPickerModal
        open
        onOpenChange={() => {}}
        parsed={{ users: [{ id: 1 }] }}
        candidates={candidates}
        onPick={() => {}}
      />,
    );
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("data.items")).toBeInTheDocument();
    expect(screen.getByText(/200 records/)).toBeInTheDocument();
    expect(screen.getByText(/5 records/)).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Root picker"
  it("W2-PM2: clicking a candidate calls onPick with the records at that path", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const parsed = { users: [{ id: 1 }, { id: 2 }] };
    render(
      <RootPickerModal
        open
        onOpenChange={() => {}}
        parsed={parsed}
        candidates={candidates}
        onPick={onPick}
      />,
    );
    await user.click(screen.getByText("users"));
    expect(onPick).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
  });
});
