import type { IR } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { Inspector } from "@/components/inspector/Inspector";
import { useStore } from "@/state/store";

const ir: IR = {
  kind: "object",
  fields: {
    status: { type: { kind: "string", literals: ["active", "pending"] } },
    age: { type: { kind: "number" } },
  },
  additional: false,
};

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("Inspector", () => {
  // Spec: docs/frontend-spec.md § "Inspector"
  // Interpretation: empty-state copy now reads "Nothing to inspect" + a
  // hint about importing data and selecting a node.
  it("W4-IN1: empty state when no IR is set", () => {
    render(<Inspector />);
    expect(screen.getByText(/nothing to inspect/i)).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Inspector"
  it("W4-IN2: prompts to select a node when no path is selected", () => {
    act(() => {
      useStore.getState().setIR(ir);
    });
    render(<Inspector />);
    expect(screen.getByText(/select a node/i)).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Inspector" — universal ops always available
  it("W4-IN3: 'Wrap in union' applies a wrap-in-union change", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setSelectedPath(["status"]);
    });
    render(<Inspector />);
    await user.click(screen.getByRole("button", { name: /wrap in union/i }));
    const newIR = useStore.getState().ir;
    expect(newIR?.kind).toBe("object");
    // The status field is now a union
    const status = (newIR as { fields: Record<string, { type: { kind: string } }> }).fields.status;
    expect(status?.type.kind).toBe("union");
  });

  // Spec: docs/frontend-spec.md § "Inspector" + StringControls
  it("W4-IN4: typing a literal and submitting issues an add-literal", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setSelectedPath(["status"]);
    });
    render(<Inspector />);
    await user.type(screen.getByLabelText(/new literal/i), "past_due");
    // Interpretation: the literal-add button was tightened to just "Add"
    // since it sits inline with the "Literals" subsection header.
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    const newIR = useStore.getState().ir;
    const status = (
      newIR as {
        fields: Record<string, { type: { literals?: string[] } }>;
      }
    ).fields.status;
    expect(status?.type.literals).toContain("past_due");
  });

  // Spec: docs/frontend-spec.md § "Inspector" — set-format
  it("W4-IN5: clicking a format button sets the format", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR({
        kind: "object",
        fields: { email: { type: { kind: "string" } } },
        additional: false,
      });
      useStore.getState().setSelectedPath(["email"]);
    });
    render(<Inspector />);
    await user.click(screen.getByRole("button", { name: /^email$/i }));
    const newIR = useStore.getState().ir;
    const f = (newIR as { fields: Record<string, { type: { format?: string } }> }).fields.email;
    expect(f?.type.format).toBe("email");
  });

  // Spec: docs/frontend-spec.md § "Inspector" — number integer toggle
  it("W4-IN6: number integer toggle issues a set-integer change", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setSelectedPath(["age"]);
    });
    render(<Inspector />);
    // Interpretation: integer toggle now displays "Off" (default) / "Required"
    // (when on). The button starts as "Off" — clicking flips it on.
    await user.click(screen.getByRole("button", { name: /^off$/i }));
    const newIR = useStore.getState().ir;
    const age = (newIR as { fields: Record<string, { type: { integer?: boolean } }> }).fields.age;
    expect(age?.type.integer).toBe(true);
  });

  // Spec: docs/frontend-spec.md § "Inspector" — object add-field
  it("W4-IN7: add field issues an add-field change", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setSelectedPath([]);
    });
    render(<Inspector />);
    await user.type(screen.getByLabelText(/new field name/i), "stripe_customer_id");
    await user.click(screen.getByRole("button", { name: /add field/i }));
    const newIR = useStore.getState().ir;
    const fields = (newIR as { fields: Record<string, unknown> }).fields;
    expect(fields.stripe_customer_id).toBeDefined();
  });
});
