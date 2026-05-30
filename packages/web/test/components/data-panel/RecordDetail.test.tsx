import type { IR } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { RecordDetail } from "@/components/data-panel/RecordDetail";
import { useStore } from "@/state/store";

const ir: IR = {
  kind: "object",
  fields: {
    id: { type: { kind: "string" } },
    status: { type: { kind: "string", literals: ["active", "pending"] } },
  },
  additional: false,
};

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("RecordDetail", () => {
  // Spec: docs/frontend-spec.md § "Per-record view"
  it("X6-RD1: renders the full JSON for the selected record", () => {
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([{ id: "a", status: "active" }]);
    });
    render(<RecordDetail open onOpenChange={() => {}} index={0} />);
    const pre = screen.getByLabelText(/record json/i);
    expect(pre.textContent).toContain('"id": "a"');
    expect(pre.textContent).toContain('"status": "active"');
  });

  // Spec: docs/frontend-spec.md § "Per-record view" — mismatch badges
  it("X6-RD2: shows mismatch badges when the record fails validation", () => {
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([{ id: "a", status: "past_due" }]);
    });
    render(<RecordDetail open onOpenChange={() => {}} index={0} />);
    expect(screen.getByText(/literal-violation/i)).toBeInTheDocument();
  });
});
