// PR Z — workspace-scoped inference options dialog.
// Plan: docs/plans/pr-z-inference-options.md
//
// Updated after the autosave refactor: no Apply / Cancel buttons; every
// edit writes through to the store immediately. Reset to defaults stays
// in the footer.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { InferenceOptionsDialog } from "@/components/inference/InferenceOptionsDialog";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("InferenceOptionsDialog", () => {
  // Plan: § "Surfaces" — "Dialog body."
  it("Z-D1: form inputs reflect the stored inferenceOptions when opened", () => {
    act(() => {
      useStore.getState().setInferenceOptions({ literals: { maxCardinality: 25 } });
    });
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.getByLabelText(/maximum distinct values/i)).toHaveValue(25);
  });

  // Autosave — editing a number writes through to the store immediately.
  it("Z-D2: editing a control autosaves to the store", async () => {
    const user = userEvent.setup();
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    const input = screen.getByLabelText(/maximum distinct values/i);
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
    expect(screen.getByLabelText(/maximum distinct values/i)).toHaveValue(20);
  });

  // IR-exists state: inputs disabled, Reset disabled, no Apply/Cancel buttons.
  it("Z-D5: when an IR exists, inputs and Reset are disabled and no Apply/Cancel buttons exist", () => {
    act(() => {
      useStore.getState().setIR({ kind: "object", fields: {}, additional: false });
      useStore.getState().setInferenceOptions({ literals: { maxCardinality: 30 } });
    });
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/schema already exists/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum distinct values/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /reset to defaults/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^apply$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^cancel$/i })).toBeNull();
  });

  // Cold-start helper copy mentions "apply immediately" + first import.
  it("Z-D6: cold-start helper banner mentions autosave + first-import scope", () => {
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/apply immediately/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum distinct values/i)).toBeEnabled();
  });

  // Default labels render in muted text next to each control.
  it("Z-D7: rows show default value as muted text (sample: maxCardinality = 20)", () => {
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/default: 20/i)).toBeInTheDocument();
  });

  // Discriminators section keeps its single 'detect' toggle.
  it("Z-D8: discriminators section has a 'Detect discriminators' toggle and no fields picker", () => {
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    const discSection = screen.getByRole("group", { name: /discriminators/i });
    expect(
      within(discSection).getByRole("checkbox", { name: /detect discriminators/i }),
    ).toBeInTheDocument();
    expect(within(discSection).queryByRole("textbox")).toBeNull();
  });

  // Percentage inputs surface 0..1 ratios as 1..100. Editing 75 stores 0.75.
  it("Z-D9: ratio inputs render as percentages and write back the fraction", async () => {
    const user = userEvent.setup();
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    const input = screen.getByLabelText(/skip when too varied/i);
    // Default is 0.3 → 30%.
    expect(input).toHaveValue(30);
    await user.clear(input);
    await user.type(input, "75");
    expect(useStore.getState().inferenceOptions?.literals?.maxUniqueRatio).toBeCloseTo(0.75);
  });
});
