// PR II (revised) — Inference step (step 3 body). Thin store wrapper over the
// shared InferenceOptionsForm + a Reset action. Form internals are covered in
// InferenceOptionsForm.test.tsx.
//
// See docs/plans/pr-ii-revised-onboarding-wizard.md.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { InferenceStep } from "@/components/welcome/InferenceStep";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("InferenceStep", () => {
  // Plan § "Inference options reorganization"
  it("Z-N1: renders the calm inference form (sections + common toggles), no modal chrome", () => {
    render(<InferenceStep />);
    expect(screen.getByRole("group", { name: /types/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /structure/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /numbers/i })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /recognise repeating values/i }),
    ).toBeInTheDocument();
    // Advanced collapsed by default → no numeric inputs; no Dialog chrome.
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // Plan § — wrapper-owned Reset.
  it("Z-N2: Reset clears stored options and is disabled when there are none", async () => {
    const user = userEvent.setup();
    render(<InferenceStep />);
    expect(screen.getByRole("button", { name: /reset to defaults/i })).toBeDisabled();

    act(() => {
      useStore.getState().setInferenceOptions({ literals: { maxCardinality: 30 } });
    });
    const reset = screen.getByRole("button", { name: /reset to defaults/i });
    expect(reset).toBeEnabled();
    await user.click(reset);
    expect(useStore.getState().inferenceOptions).toBeNull();
  });
});
