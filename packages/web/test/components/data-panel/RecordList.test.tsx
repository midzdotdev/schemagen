import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecordList } from "../../../src/components/data-panel/RecordList";

describe("RecordList", () => {
  // Spec: docs/frontend-spec.md § "Per-record view"
  it("W2-RL1: empty state when no records", () => {
    render(<RecordList records={[]} />);
    expect(screen.getByText(/no records yet/i)).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Per-record view"
  it("W2-RL2: renders one entry per record with the count badge", () => {
    render(<RecordList records={[{ id: 1 }, { id: 2 }, { id: 3 }]} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /records/i }).children).toHaveLength(3);
  });
});
