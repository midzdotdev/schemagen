import type { IR } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { SchemaTree } from "@/components/schema-tree/SchemaTree";
import { useStore } from "@/state/store";

// Deeply nested IR: root.a.b.c.d (4 levels deep)
const deepIR: IR = {
  kind: "object",
  fields: {
    a: {
      type: {
        kind: "object",
        fields: {
          b: {
            type: {
              kind: "object",
              fields: {
                c: {
                  type: {
                    kind: "object",
                    fields: { d: { type: { kind: "string" } } },
                    additional: false,
                  },
                },
              },
              additional: false,
            },
          },
        },
        additional: false,
      },
    },
  },
  additional: false,
};

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("schema tree default-collapse", () => {
  // Spec: docs/frontend-spec.md § "Schema tree" — default-collapse below depth 3
  it("X6-DC1: rows at depth < 3 render expanded; depth >= 3 render collapsed", () => {
    act(() => {
      useStore.getState().setIR(deepIR);
    });
    render(<SchemaTree />);
    // depth 0 (root), 1 (a), 2 (b) all visible.
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
    // depth 3 (c) is reachable visually but its child d should be collapsed
    // because depth(c) = 3.
    expect(screen.getByText("c")).toBeInTheDocument();
    // d is at depth 4, inside a collapsed parent (c) — should NOT be visible.
    expect(screen.queryByText("d")).not.toBeInTheDocument();
  });
});
