// Records sidebar — collapsible third pane that supersedes the post-IR
// RecordsModal. Owns the 'Add data' affordance now that the schema header
// no longer carries it.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordsSidebar } from "@/components/data-panel/RecordsSidebar";
import { UIShellProvider } from "@/components/shell/UIShell";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
  useStore.getState().hydrate({ workspaceId: "ws-sidebar" });
  Element.prototype.scrollIntoView = () => {};
});

function renderSidebar(props: { collapsed: boolean; onToggle?: () => void }) {
  return render(
    <UIShellProvider>
      <RecordsSidebar collapsed={props.collapsed} onToggle={props.onToggle ?? (() => {})} />
    </UIShellProvider>,
  );
}

describe("RecordsSidebar — collapsed strip", () => {
  it("renders the record count and a single expand button", () => {
    act(() => {
      useStore.getState().setRecords([{ id: "a" }, { id: "b" }, { id: "c" }]);
    });
    renderSidebar({ collapsed: true });
    expect(screen.getByRole("button", { name: /expand records sidebar/i })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onToggle when the strip is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    act(() => {
      useStore.getState().setRecords([{ id: "a" }]);
    });
    renderSidebar({ collapsed: true, onToggle });
    await user.click(screen.getByRole("button", { name: /expand records sidebar/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("RecordsSidebar — expanded header", () => {
  it("renders an 'Add data' button next to the collapse chevron", () => {
    act(() => {
      useStore.getState().setRecords([{ id: "a" }]);
    });
    renderSidebar({ collapsed: false });
    expect(screen.getByRole("button", { name: /add data/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse records sidebar/i })).toBeInTheDocument();
  });

  it("clicking 'Add data' opens the AddDataModal", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setRecords([{ id: "a" }]);
    });
    renderSidebar({ collapsed: false });
    await user.click(screen.getByRole("button", { name: /add data/i }));
    expect(screen.getByRole("dialog", { name: /add data/i })).toBeInTheDocument();
  });
});

describe("RecordsSidebar — filter chip", () => {
  it("shows the chip with path and predicate when a filter is active", () => {
    act(() => {
      useStore.getState().setRecords([{ x: 1 }, { x: 2 }]);
      useStore
        .getState()
        .setRecordsFilter({ path: "user.id", predicate: "is present", indices: [0] });
    });
    renderSidebar({ collapsed: false });
    expect(screen.getByText("user.id")).toBeInTheDocument();
    expect(screen.getByText("is present")).toBeInTheDocument();
  });

  it("the × clears the filter", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setRecords([{ x: 1 }, { x: 2 }]);
      useStore
        .getState()
        .setRecordsFilter({ path: "x", predicate: "= 1", indices: [0] });
    });
    renderSidebar({ collapsed: false });
    await user.click(screen.getByRole("button", { name: /clear records filter/i }));
    expect(useStore.getState().recordsFilter).toBeNull();
  });

  it("header description switches to 'Showing X of Y' when filter active", () => {
    act(() => {
      useStore.getState().setRecords([{ x: 1 }, { x: 2 }, { x: 3 }]);
      useStore
        .getState()
        .setRecordsFilter({ path: "x", predicate: "= 1", indices: [0] });
    });
    renderSidebar({ collapsed: false });
    expect(screen.getByText(/showing 1 of 3/i)).toBeInTheDocument();
  });
});
