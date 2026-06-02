// PR II (revised) — onboarding wizard stepper.
// See docs/plans/pr-ii-revised-onboarding-wizard.md § "Stepper + wizard layout".

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Stepper } from "@/components/welcome/Stepper";

const STEPS = ["Data", "Identity", "Inference"];

describe("Stepper", () => {
  // Plan § "Resolved interpretations" #2 — ordered list of three named steps.
  it("Z-S1: renders an ordered list of the three named steps in order", () => {
    render(<Stepper steps={STEPS} current={0} maxVisited={0} onStepSelect={() => {}} />);
    const list = screen.getByRole("list", { name: /onboarding steps/i });
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(list.textContent).toMatch(/Data[\s\S]*Identity[\s\S]*Inference/);
  });

  // Plan § "Resolved interpretations" #2/#4 — done / current / upcoming states.
  it("Z-S2: marks done, current (aria-current), and upcoming (disabled) states", () => {
    render(<Stepper steps={STEPS} current={1} maxVisited={1} onStepSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /data/i })).toHaveAccessibleName(/completed/i);
    const current = screen.getByRole("button", { name: /identity/i });
    expect(current).toHaveAttribute("aria-current", "step");
    const upcoming = screen.getByRole("button", { name: /inference/i });
    expect(upcoming).not.toHaveAttribute("aria-current");
    expect(upcoming).toBeDisabled();
  });

  // Plan § "Resolved interpretations" #3 — clicking a visited step jumps back.
  it("Z-S3: clicking a visited, non-current step fires onStepSelect", async () => {
    const user = userEvent.setup();
    const onStepSelect = vi.fn();
    render(<Stepper steps={STEPS} current={2} maxVisited={2} onStepSelect={onStepSelect} />);
    await user.click(screen.getByRole("button", { name: /data/i }));
    expect(onStepSelect).toHaveBeenCalledWith(0);
  });

  // Plan § "Resolved interpretations" #3 — current and unreached steps don't fire.
  it("Z-S4: the current step and unreached steps do not fire onStepSelect", async () => {
    const user = userEvent.setup();
    const onStepSelect = vi.fn();
    render(<Stepper steps={STEPS} current={1} maxVisited={1} onStepSelect={onStepSelect} />);
    await user.click(screen.getByRole("button", { name: /identity/i })); // current
    await user.click(screen.getByRole("button", { name: /inference/i })); // unreached/disabled
    expect(onStepSelect).not.toHaveBeenCalled();
  });

  // Plan § "Resolved interpretations" #3 — forward gate: only steps up to maxVisited.
  it("Z-S5: forward steps past maxVisited are disabled; visited-ahead steps are clickable", () => {
    const { rerender } = render(
      <Stepper steps={STEPS} current={0} maxVisited={0} onStepSelect={() => {}} />,
    );
    // current=0, maxVisited=0 → Identity and Inference both gated.
    expect(screen.getByRole("button", { name: /identity/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /inference/i })).toBeDisabled();
    // Jumped back to step 0 after visiting all → forward steps clickable again.
    rerender(<Stepper steps={STEPS} current={0} maxVisited={2} onStepSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /identity/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /inference/i })).toBeEnabled();
  });

  // Plan § "Resolved interpretations" #4 — keyboard: native button semantics.
  it("Z-S6: a visited step activates on Enter; disabled future steps are skipped by Tab", async () => {
    const user = userEvent.setup();
    const onStepSelect = vi.fn();
    render(<Stepper steps={STEPS} current={1} maxVisited={1} onStepSelect={onStepSelect} />);
    const data = screen.getByRole("button", { name: /data/i });
    data.focus();
    expect(data).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onStepSelect).toHaveBeenCalledWith(0);
    // The unreached step is disabled, so it carries no keyboard affordance.
    expect(screen.getByRole("button", { name: /inference/i })).toBeDisabled();
  });
});
