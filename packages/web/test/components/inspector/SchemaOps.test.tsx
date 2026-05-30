// Coverage for the previously-unwired schema ops.
// Spec: docs/frontend-spec.md § "Inspector"

import type { IR } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { Inspector } from "../../../src/components/inspector/Inspector";
import { useStore } from "../../../src/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("Inspector — object ops", () => {
  function renderObject() {
    const ir: IR = {
      kind: "object",
      fields: {
        a: { type: { kind: "string" } },
        b: { type: { kind: "number" } },
        c: { type: { kind: "boolean" } },
      },
      additional: false,
    };
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setSelectedPath([]);
    });
    render(<Inspector />);
  }

  it("OBJ-RENAME: clicking a field name + typing issues rename-field", async () => {
    const user = userEvent.setup();
    renderObject();
    await user.click(screen.getByRole("button", { name: /^a$/ }));
    const input = screen.getByLabelText(/rename field a/i);
    await user.clear(input);
    await user.type(input, "alpha{enter}");
    const fields = (useStore.getState().ir as { fields: Record<string, unknown> }).fields;
    expect(fields).toHaveProperty("alpha");
    expect(fields).not.toHaveProperty("a");
  });

  it("OBJ-REORDER: Move down sends the field below its neighbour", async () => {
    const user = userEvent.setup();
    renderObject();
    await user.click(screen.getByRole("button", { name: /move a down/i }));
    const fields = useStore.getState().ir as { fields: Record<string, unknown> };
    expect(Object.keys(fields.fields)).toEqual(["b", "a", "c"]);
  });

  it("OBJ-SETTYPE: opening the kind menu and picking a kind issues set-field-type", async () => {
    const user = userEvent.setup();
    renderObject();
    await user.click(screen.getByRole("button", { name: /change type of a/i }));
    await user.click(screen.getByRole("button", { name: /set type to boolean/i }));
    const fields = (
      useStore.getState().ir as { fields: Record<string, { type: { kind: string } }> }
    ).fields;
    expect(fields.a?.type.kind).toBe("boolean");
  });
});

describe("Inspector — array ops", () => {
  it("ARR-BOUND: setting minItems issues set-bound with minItems", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR({
        kind: "object",
        fields: { tags: { type: { kind: "array", items: { kind: "string" } } } },
        additional: false,
      });
      useStore.getState().setSelectedPath(["tags"]);
    });
    render(<Inspector />);
    const input = screen.getByLabelText(/^minItems bound$/i);
    await user.clear(input);
    await user.type(input, "1");
    const tags = (
      useStore.getState().ir as unknown as {
        fields: { tags: { type: { minItems?: number } } };
      }
    ).fields.tags?.type;
    expect(tags?.minItems).toBe(1);
  });
});

describe("Inspector — string pattern", () => {
  it("STR-PATTERN: submitting a pattern issues set-pattern", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR({
        kind: "object",
        fields: { sku: { type: { kind: "string" } } },
        additional: false,
      });
      useStore.getState().setSelectedPath(["sku"]);
    });
    render(<Inspector />);
    const input = screen.getByLabelText(/regex pattern/i);
    // user.type interprets [ and { as key-prefix syntax; escape with [[ and {{.
    await user.type(input, "^[[A-Z]+$");
    input.blur();
    const sku = (
      useStore.getState().ir as unknown as {
        fields: { sku: { type: { pattern?: string } } };
      }
    ).fields.sku?.type;
    expect(sku?.pattern).toBe("^[A-Z]+$");
  });
});

describe("Inspector — union ops", () => {
  function renderUnion() {
    // Core requires unions to keep ≥2 variants, so seed with three so we
    // can exercise the remove path.
    const ir: IR = {
      kind: "union",
      variants: [{ kind: "string" }, { kind: "number" }, { kind: "boolean" }],
    };
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setSelectedPath([]);
    });
    render(<Inspector />);
  }

  it("UNION-ADD: clicking +boolean adds a variant", async () => {
    const user = userEvent.setup();
    renderUnion();
    await user.click(screen.getByRole("button", { name: /^boolean$/i }));
    const variants = (useStore.getState().ir as { variants: { kind: string }[] }).variants;
    expect(variants.map((v) => v.kind)).toContain("boolean");
  });

  it("UNION-REMOVE: removing a variant updates the IR", async () => {
    const user = userEvent.setup();
    renderUnion();
    const removeBtn = screen.getByRole("button", { name: "Remove variant 1" });
    await user.click(removeBtn);
    const variants = (useStore.getState().ir as { variants: { kind: string }[] }).variants;
    expect(variants.map((v) => v.kind)).toEqual(["string", "boolean"]);
  });

  it("UNION-DISC: setting a discriminator updates the IR", async () => {
    const user = userEvent.setup();
    renderUnion();
    const input = screen.getByLabelText(/discriminator field/i);
    await user.type(input, "type");
    await user.click(screen.getByRole("button", { name: /^set$/i }));
    const ir = useStore.getState().ir as { discriminator?: string };
    expect(ir.discriminator).toBe("type");
  });
});
