// PR HH Phase 5 — Step 3 (Inference). See docs/plans/pr-hh-workspace-wizard.md.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UIShellProvider } from "@/components/shell/UIShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StepInference } from "@/components/welcome/StepInference";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
  act(() => {
    useStore.getState().setRecords([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
  });
});

function renderStep(props: { onGenerate?: () => void; onBack?: () => void; onSkip?: () => void }) {
  return render(
    <TooltipProvider>
      <UIShellProvider>
        <StepInference
          onGenerate={props.onGenerate ?? (() => {})}
          onBack={props.onBack ?? (() => {})}
          onSkip={props.onSkip ?? (() => {})}
        />
      </UIShellProvider>
    </TooltipProvider>,
  );
}

describe("StepInference", () => {
  // Plan § "Step 3 — Inference options" — summary card lists each option
  it("HH-N1: summary renders the inference option rows", () => {
    renderStep({});
    const list = screen.getByRole("list");
    const items = list.querySelectorAll("li");
    const labels = Array.from(items).map((li) => li.textContent ?? "");
    expect(labels.some((t) => /literal unions/i.test(t))).toBe(true);
    expect(labels.some((t) => /string formats/i.test(t))).toBe(true);
    expect(labels.some((t) => /numeric ranges/i.test(t))).toBe(true);
  });

  // Plan § "Step 3 — Inference options" — Adjust opens the existing dialog
  it("HH-N2: 'Adjust options…' opens the InferenceOptionsDialog", async () => {
    const user = userEvent.setup();
    renderStep({});
    await user.click(screen.getByRole("button", { name: /adjust options/i }));
    expect(screen.getByRole("dialog", { name: /inference options/i })).toBeInTheDocument();
  });

  // Plan § "Step 3 — Inference options" — Generate fires inferSchema
  it("HH-W8: 'Generate schema' calls inferSchema (IR set) and onGenerate", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    renderStep({ onGenerate });
    await user.click(screen.getByRole("button", { name: /generate schema/i }));
    expect(useStore.getState().ir).not.toBeNull();
    expect(onGenerate).toHaveBeenCalledOnce();
  });
});
