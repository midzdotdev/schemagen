import type { IR } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { SchemaTree } from "../../../src/components/schema-tree/SchemaTree";
import { useStore } from "../../../src/state/store";

const ir: IR = {
  kind: "object",
  fields: {
    id: { type: { kind: "string", format: "uuid" } },
    status: { type: { kind: "string", literals: ["active", "pending"] } },
    avatar_url: { type: { kind: "string" }, optional: true },
    tags: { type: { kind: "array", items: { kind: "string" } } },
  },
  additional: false,
};

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("SchemaTree", () => {
  // Spec: docs/frontend-spec.md § "Schema tree (center)"
  // Interpretation: the empty-state messaging moved to SchemaPanel (the
  // pane wrapper). SchemaTree itself renders nothing when no IR is set —
  // it's a pure tree component now, with framing handled outside.
  it("W3-ST1: renders nothing when no IR is set", () => {
    const { container } = render(<SchemaTree />);
    expect(container.firstChild).toBeNull();
  });

  // Spec: docs/frontend-spec.md § "Schema tree (center)"
  it("W3-ST2: renders the IR as a tree with each field labeled", () => {
    act(() => {
      useStore.getState().setIR(ir);
    });
    render(<SchemaTree />);
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("avatar_url")).toBeInTheDocument();
    expect(screen.getByText("tags")).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Schema tree (center)" — optional/nullable badges
  it("W3-ST3: renders an 'optional' badge on optional field rows", () => {
    act(() => {
      useStore.getState().setIR(ir);
    });
    render(<SchemaTree />);
    expect(screen.getByText("optional")).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Schema tree" — string literal display
  it("W3-ST4: renders string literals inline", () => {
    act(() => {
      useStore.getState().setIR(ir);
    });
    render(<SchemaTree />);
    expect(screen.getByText('"active" | "pending"')).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Schema tree" — selection
  it("W3-ST5: clicking a row sets selectedPath in the store", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
    });
    render(<SchemaTree />);
    await user.click(screen.getByText("id"));
    expect(useStore.getState().selectedPath).toEqual(["id"]);
  });

  // Spec: docs/frontend-spec.md § "Schema tree" — nested rendering for arrays
  it("W3-ST6: array nodes expose their 'items' child row", () => {
    act(() => {
      useStore.getState().setIR(ir);
    });
    render(<SchemaTree />);
    expect(screen.getByText("items")).toBeInTheDocument();
  });
});
