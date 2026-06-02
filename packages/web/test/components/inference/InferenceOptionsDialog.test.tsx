// PR Z / PR II (revised) — inference options dialog (thin shell over the shared
// InferenceOptionsForm). The form internals are covered in
// InferenceOptionsForm.test.tsx; these tests cover the shell: stored-value
// wiring, autosave through the store, Reset, the persistent (non-cold-start)
// behaviour, and Advanced auto-open.
//
// Plan: docs/plans/pr-ii-revised-onboarding-wizard.md.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { InferenceOptionsDialog } from "@/components/inference/InferenceOptionsDialog";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("InferenceOptionsDialog", () => {
  // A non-default stored value auto-opens Advanced, so the moved knob is visible.
  it("Z-D1: form inputs reflect the stored inferenceOptions when opened", () => {
    act(() => {
      useStore.getState().setInferenceOptions({ literals: { maxCardinality: 25 } });
    });
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.getByLabelText(/most distinct values to list/i)).toHaveValue(25);
  });

  // Autosave — editing a control writes through to the store immediately.
  it("Z-D2: editing a control autosaves to the store", async () => {
    const user = userEvent.setup();
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByText(/advanced/i));
    const input = screen.getByLabelText(/most distinct values to list/i);
    await user.clear(input);
    await user.type(input, "30");
    expect(useStore.getState().inferenceOptions?.literals?.maxCardinality).toBe(30);
  });

  // Reset clears stored options and the rendered form snaps to defaults.
  it("Z-D4: Reset to defaults clears stored options and form reverts", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setInferenceOptions({ literals: { maxCardinality: 30 } });
    });
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /reset to defaults/i }));
    expect(useStore.getState().inferenceOptions).toBeNull();
    expect(screen.getByLabelText(/most distinct values to list/i)).toHaveValue(20);
  });

  // Persistent (PR FF) — options stay editable after a schema exists.
  it("Z-D5: inference options stay editable after a schema exists", () => {
    act(() => {
      useStore.getState().setIR({ kind: "object", fields: {}, additional: false });
      useStore.getState().setInferenceOptions({ literals: { maxCardinality: 30 } });
    });
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.getByLabelText(/most distinct values to list/i)).toBeEnabled();
    expect(screen.getByRole("button", { name: /reset to defaults/i })).toBeEnabled();
    expect(screen.queryByText(/only at first import|once a schema exists/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /^apply$/i })).toBeNull();
  });

  // The banner describes inference without claiming a cold-start-only scope, and
  // a common toggle is interactive.
  it("Z-D6: helper banner has no first-import-only scope; a common toggle is live", () => {
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/infers types from your records/i)).toBeInTheDocument();
    expect(screen.queryByText(/only at first import|once a schema exists/i)).toBeNull();
    expect(screen.getByRole("checkbox", { name: /recognise repeating values/i })).toBeEnabled();
  });

  // Default labels live on the advanced rows, behind the disclosure.
  it("Z-D7: advanced rows show their default values (sample: Default: 20)", async () => {
    const user = userEvent.setup();
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.queryByText(/default: 20/i)).toBeNull();
    await user.click(screen.getByText(/advanced/i));
    expect(screen.getByText(/default: 20/i)).toBeInTheDocument();
  });

  // Discriminators is now a single toggle inside Advanced, not its own group,
  // and still has no fields picker.
  it("Z-D8: discriminators is an Advanced toggle, not its own group, no field picker", async () => {
    const user = userEvent.setup();
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.queryByRole("group", { name: /discriminators/i })).toBeNull();
    await user.click(screen.getByText(/advanced/i));
    expect(
      screen.getByRole("checkbox", { name: /type tag.*splits records into variants/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  // Percentage inputs surface 0..1 ratios as 0..100. Editing 75 stores 0.75.
  it("Z-D9: ratio inputs render as percentages and write back the fraction", async () => {
    const user = userEvent.setup();
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByText(/advanced/i));
    const input = screen.getByLabelText(/skip when too varied/i);
    expect(input).toHaveValue(30);
    await user.clear(input);
    await user.type(input, "75");
    expect(useStore.getState().inferenceOptions?.literals?.maxUniqueRatio).toBeCloseTo(0.75);
  });
});
