import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RootPickerModal } from "@/components/data-panel/RootPickerModal";
import type { PickerCandidate } from "@/lib/root-picker";

const candidates: PickerCandidate[] = [
  { path: ["users"], recordCount: 2, preview: { id: 1 } },
  { path: ["data", "items"], recordCount: 1, preview: { x: "y" } },
];

const parsed = {
  users: [{ id: 1 }, { id: 2 }],
  data: { items: [{ x: "y" }] },
  meta: { source: "api" },
};

describe("RootPickerModal", () => {
  // Tree view shows the root container plus first-level keys; ancestors of a
  // candidate auto-expand so the pickable arrays are visible.
  it("W2-PM1: renders the JSON tree with candidate arrays auto-expanded into view", () => {
    render(
      <RootPickerModal
        open
        onOpenChange={() => {}}
        parsed={parsed}
        candidates={candidates}
        onPick={() => {}}
      />,
    );
    const tree = screen.getByRole("list", { name: /json tree/i });
    expect(within(tree).getByText("users")).toBeInTheDocument();
    expect(within(tree).getByText("data")).toBeInTheDocument();
    // 'items' is one level deep but its parent (data) is auto-expanded.
    expect(within(tree).getByText("items")).toBeInTheDocument();
    // Both candidates surface a "Use this" button — meta is not a candidate.
    expect(screen.getAllByRole("button", { name: /use this/i })).toHaveLength(2);
  });

  // Clicking 'Use this' commits the records at that path.
  it("W2-PM2: clicking 'Use this' on a candidate calls onPick with its records", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <RootPickerModal
        open
        onOpenChange={() => {}}
        parsed={parsed}
        candidates={candidates}
        onPick={onPick}
      />,
    );
    // The 'users' row's Use this button is the first; click it.
    const usersRow = screen.getByText("users").closest("li");
    if (!usersRow) throw new Error("users row not found");
    await user.click(within(usersRow).getByRole("button", { name: /use this/i }));
    expect(onPick).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
  });

  // Non-candidate containers (objects, arrays-of-primitives) have no pick
  // button — only browsable.
  it("W2-PM3: non-candidate containers are browsable but not pickable", () => {
    render(
      <RootPickerModal
        open
        onOpenChange={() => {}}
        parsed={parsed}
        candidates={candidates}
        onPick={() => {}}
      />,
    );
    const metaRow = screen.getByText("meta").closest("li");
    if (!metaRow) throw new Error("meta row not found");
    expect(within(metaRow).queryByRole("button", { name: /use this/i })).toBeNull();
  });

  // Expand / collapse: clicking the chevron on a closed container reveals
  // its children.
  it("W2-PM4: clicking the chevron on a closed container reveals its children", async () => {
    const user = userEvent.setup();
    render(
      <RootPickerModal
        open
        onOpenChange={() => {}}
        parsed={parsed}
        candidates={candidates}
        onPick={() => {}}
      />,
    );
    // 'meta' is closed by default (not a candidate ancestor). Its child 'source'
    // shouldn't be visible yet.
    expect(screen.queryByText("source")).toBeNull();
    const metaRow = screen.getByText("meta").closest("li");
    if (!metaRow) throw new Error("meta row not found");
    await user.click(within(metaRow).getByRole("button", { name: /expand/i }));
    expect(screen.getByText("source")).toBeInTheDocument();
  });
});
