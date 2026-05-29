import type { IR } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { ExamplesButton } from "../../../src/components/inspector/ExamplesButton";
import { useStore } from "../../../src/state/store";

const ir: IR = {
  kind: "object",
  fields: { status: { type: { kind: "string" } } },
  additional: false,
};

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("ExamplesButton", () => {
  // Spec: docs/frontend-spec.md § "Schema tree" — "Show example records" affordance
  it("X3-EB1: renders nothing without an IR or selected path", () => {
    render(<ExamplesButton />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Schema tree"
  it("X3-EB2: populates selectedRecordIndices with matching record indices", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore
        .getState()
        .setRecords([{ status: "active" }, { status: "pending" }, { status: "active" }]);
      useStore.getState().setSelectedPath(["status"]);
    });
    render(<ExamplesButton predicate={(v) => v === "pending"} />);
    await user.click(screen.getByRole("button"));
    expect(useStore.getState().selectedRecordIndices).toEqual([1]);
  });

  // Spec: docs/frontend-spec.md § "Schema tree" — no predicate matches all records where path exists
  it("X3-EB3: with no predicate, returns all records that have the path", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([{ status: "active" }, {}, { status: "pending" }]);
      useStore.getState().setSelectedPath(["status"]);
    });
    render(<ExamplesButton />);
    await user.click(screen.getByRole("button"));
    expect(useStore.getState().selectedRecordIndices).toEqual([0, 2]);
  });
});
