import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecordList } from "@/components/data-panel/RecordList";

describe("RecordList", () => {
  // Spec: docs/frontend-spec.md § "Per-record view"
  // Interpretation: empty-state copy was hoisted to DataPanel, so the list
  // itself renders nothing when records.length === 0 (no children rendered).
  it("W2-RL1: renders nothing when no records", () => {
    const { container } = render(<RecordList records={[]} />);
    expect(container.firstChild).toBeNull();
  });

  // Spec: docs/frontend-spec.md § "Per-record view"
  it("W2-RL2: renders one entry per record", () => {
    render(<RecordList records={[{ id: 1 }, { id: 2 }, { id: 3 }]} />);
    expect(screen.getByRole("list", { name: /records/i }).children).toHaveLength(3);
  });
});
