// PR Z — workspace-scoped inference options dialog.
// Plan: docs/plans/pr-z-inference-options.md

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

  // Plan: § "Persistence" — Apply commits. Interpretation #2.
  it("Z-D2: Apply writes form state into the store", async () => {
    const user = userEvent.setup();
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    const input = screen.getByLabelText(/maximum distinct values/i);
    await user.clear(input);
    await user.type(input, "30");
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    expect(useStore.getState().inferenceOptions?.literals?.maxCardinality).toBe(30);
  });

  // Interpretation #2 — Cancel discards.
  it("Z-D3: Cancel discards form changes; store unchanged", async () => {
    const user = userEvent.setup();
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    const input = screen.getByLabelText(/maximum distinct values/i);
    await user.clear(input);
    await user.type(input, "30");
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(useStore.getState().inferenceOptions).toBeNull();
  });

  // Plan: § "Surfaces" — "Reset button." Interpretation #5.
  it("Z-D4: Reset clears stored options and reseeds form to defaults", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setInferenceOptions({ literals: { maxCardinality: 30 } });
    });
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /reset to defaults/i }));
    expect(useStore.getState().inferenceOptions).toBeNull();
    expect(screen.getByLabelText(/maximum distinct values/i)).toHaveValue(20);
  });

  // Plan: § "Tests" — "Dialog shows notice + disables inputs when `ir !== null`." Interpretation #3.
  it("Z-D5: when an IR exists, the IR-set notice is shown, inputs are disabled, Apply is hidden", () => {
    act(() => {
      useStore.getState().setIR({ kind: "object", fields: {}, additional: false });
    });
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/schema already exists/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum distinct values/i)).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^apply$/i })).toBeNull();
  });

  // Plan: § "Scope" — cold-start only.
  // Collapses original catalog T18 (banner copy verbatim): the cold-start variant is checked here.
  it("Z-D6: when no IR, the cold-start helper banner is shown and inputs are enabled", () => {
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/apply only to a new workspace/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum distinct values/i)).toBeEnabled();
  });

  // Plan: § "Surfaces" — "Each row shows its default value next to the input as muted text."
  it("Z-D7: rows show default value as muted text (sample: maxCardinality = 20)", () => {
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/default: 20/i)).toBeInTheDocument();
  });

  // Plan-implementation § "Resolved interpretations" #1 — discriminators is enable-toggle-only.
  it("Z-D8: discriminators section has an enable toggle and no fields picker", () => {
    render(<InferenceOptionsDialog open onOpenChange={() => {}} />);
    const discSection = screen.getByRole("group", { name: /discriminators/i });
    expect(
      within(discSection).getByRole("checkbox", { name: /detect discriminators/i }),
    ).toBeInTheDocument();
    expect(within(discSection).queryByRole("textbox")).toBeNull();
  });
});
