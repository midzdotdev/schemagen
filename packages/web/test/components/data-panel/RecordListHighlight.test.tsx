import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { RecordList } from "@/components/data-panel/RecordList";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
  // jsdom doesn't implement scrollIntoView; stub it.
  Element.prototype.scrollIntoView = () => {};
});

describe("RecordList filter", () => {
  // Spec: docs/frontend-spec.md § "Schema tree" — active filter narrows the
  // visible records to those matching the filter, preserving original indices.
  it("X3-RL1: shows only filtered records when a filter is active", () => {
    act(() => {
      useStore.getState().setRecords([{ x: "a" }, { x: "b" }, { x: "c" }, { x: "d" }]);
      useStore.getState().setRecordsFilter({ path: "x", predicate: "= b or d", indices: [1, 3] });
    });
    render(<RecordList records={[{ x: "a" }, { x: "b" }, { x: "c" }, { x: "d" }]} />);
    const list = screen.getByRole("list", { name: /records/i });
    expect(list.children).toHaveLength(2);
  });

  it("X3-RL2: clearing the filter restores the full record list", () => {
    act(() => {
      useStore.getState().setRecords([{ x: "a" }, { x: "b" }, { x: "c" }]);
      useStore.getState().setRecordsFilter({ path: "x", predicate: "= b", indices: [1] });
      useStore.getState().setRecordsFilter(null);
    });
    render(<RecordList records={[{ x: "a" }, { x: "b" }, { x: "c" }]} />);
    const list = screen.getByRole("list", { name: /records/i });
    expect(list.children).toHaveLength(3);
  });
});
