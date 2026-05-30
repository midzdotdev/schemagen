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

describe("RecordList highlight", () => {
  // Spec: docs/frontend-spec.md § "Schema tree" — selected records highlighted
  it("X3-RL1: applies the selected-record marker to indices in the store", () => {
    act(() => {
      useStore.getState().setSelectedRecordIndices([1, 3]);
    });
    render(<RecordList records={[{ x: "a" }, { x: "b" }, { x: "c" }, { x: "d" }]} />);
    expect(screen.getAllByTestId("selected-record")).toHaveLength(2);
  });
});
