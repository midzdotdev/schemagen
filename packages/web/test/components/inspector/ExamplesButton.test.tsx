import type { IR } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { ExamplesButton } from "@/components/inspector/ExamplesButton";
import { useStore } from "@/state/store";

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
  it("X3-EB2: sets the records filter to the matching indices", async () => {
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
    expect(useStore.getState().recordsFilter?.indices).toEqual([1]);
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
    expect(useStore.getState().recordsFilter?.indices).toEqual([0, 2]);
  });

  // The chip's `path` segment shows the selected path so the user can see what
  // they filtered by; the `predicate` segment explains what the filter checks.
  it("X3-EB4: filter sets path to the formatted selected path", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([{ status: "active" }]);
      useStore.getState().setSelectedPath(["status"]);
    });
    render(<ExamplesButton />);
    await user.click(screen.getByRole("button"));
    expect(useStore.getState().recordsFilter?.path).toBe("status");
  });

  it("X3-EB5: predicate defaults to 'is present' so the chip explains the no-predicate case", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([{ status: "active" }]);
      useStore.getState().setSelectedPath(["status"]);
    });
    render(<ExamplesButton />);
    await user.click(screen.getByRole("button"));
    expect(useStore.getState().recordsFilter?.predicate).toBe("is present");
  });
});
