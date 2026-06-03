// PR II (revised) — shared inference-options form.
// See docs/plans/pr-ii-revised-onboarding-wizard.md § "Inference options reorganization".

import type { InferOptions } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { InferenceOptionsForm } from "@/components/inference/InferenceOptionsForm";

// Stateful harness so the controlled inputs are genuinely editable (and a spy
// can observe every committed value), mirroring how the wrappers drive it.
function Harness({
  initial = null,
  defaultAdvancedOpen,
  spy,
}: {
  initial?: InferOptions | null;
  defaultAdvancedOpen?: boolean;
  spy?: (next: InferOptions | null) => void;
}) {
  const [value, setValue] = useState<InferOptions | null>(initial);
  return (
    <InferenceOptionsForm
      value={value}
      defaultAdvancedOpen={defaultAdvancedOpen}
      onChange={(next) => {
        spy?.(next);
        setValue(next);
      }}
    />
  );
}

describe("InferenceOptionsForm", () => {
  // Plan § "Inference options reorganization" — three sections, four common
  // toggles, nothing numeric until Advanced is opened.
  it("Z-F1: shows three sections + four common toggles, no numeric inputs collapsed", () => {
    render(<InferenceOptionsForm value={null} onChange={() => {}} />);
    // The three plain-language sections (the 4th group role is the <details>).
    expect(screen.getByRole("group", { name: /types/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /structure/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /numbers/i })).toBeInTheDocument();

    expect(screen.getByRole("checkbox", { name: /detect literal unions/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /string formats/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /reject unknown fields/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /integer detection/i })).toBeInTheDocument();

    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  // Plan § — the seven advanced knobs appear (with Default labels) once expanded.
  it("Z-F2: expanding Advanced reveals the rarer knobs with their defaults", async () => {
    const user = userEvent.setup();
    render(<InferenceOptionsForm value={null} onChange={() => {}} />);
    expect(screen.queryByText(/default: 20/i)).toBeNull();
    await user.click(screen.getByText(/advanced/i));
    expect(screen.getByText(/default: 20/i)).toBeInTheDocument(); // maxCardinality
    expect(screen.getByText(/default: 30%/i)).toBeInTheDocument(); // maxUniqueRatio
    expect(screen.getByText(/default: 100% of records/i)).toBeInTheDocument(); // optionalThreshold
    expect(screen.getByText(/default: record as evidence only/i)).toBeInTheDocument(); // rangeMode
    expect(screen.getByText(/default: allow either/i)).toBeInTheDocument(); // onTypeConflict
  });

  // Plan § — autosave: a common toggle and an Advanced number both commit.
  it("Z-F3: editing a common toggle and an advanced number both call onChange", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await user.click(screen.getByRole("checkbox", { name: /detect literal unions/i }));
    expect(spy.mock.lastCall?.[0]?.literals?.enable).toBe(false);

    await user.click(screen.getByText(/advanced/i));
    const input = screen.getByLabelText(/max cardinality/i);
    await user.clear(input);
    await user.type(input, "30");
    expect(spy.mock.lastCall?.[0]?.literals?.maxCardinality).toBe(30);
  });

  // Plan § interpretations #7/#8 — always editable, no read-only mode.
  it("Z-F4: controls are interactive for any value", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ literals: { maxCardinality: 30 } }} defaultAdvancedOpen />);
    expect(screen.getByRole("checkbox", { name: /detect literal unions/i })).toBeEnabled();
    expect(screen.getByLabelText(/max cardinality/i)).toBeEnabled();
    // Toggling actually works (not a static render).
    await user.click(screen.getByRole("checkbox", { name: /reject unknown fields/i }));
    expect(screen.getByRole("checkbox", { name: /reject unknown fields/i })).not.toBeChecked();
  });

  // Plan § — percent inputs surface 0..1 ratios as 0..100 and round-trip back.
  it("Z-F6: percent inputs render fractions as percents and write back fractions", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness spy={spy} defaultAdvancedOpen />);
    expect(screen.getByLabelText(/max unique ratio/i)).toHaveValue(30); // 0.3 → 30
    expect(screen.getByLabelText(/required-field threshold/i)).toHaveValue(100);
    const varied = screen.getByLabelText(/max unique ratio/i);
    await user.clear(varied);
    await user.type(varied, "75");
    expect(spy.mock.lastCall?.[0]?.literals?.maxUniqueRatio).toBeCloseTo(0.75);
  });

  // Plan § — wrapper can request Advanced open on mount.
  it("Z-F7: defaultAdvancedOpen renders the advanced knobs immediately", () => {
    render(<InferenceOptionsForm value={null} onChange={() => {}} defaultAdvancedOpen />);
    expect(screen.getByText(/default: 20/i)).toBeInTheDocument();
  });

  // Plan § interpretation #13 — strict defaults, no presets.
  it("Z-F8: value=null shows strict defaults with no preset selector", () => {
    render(<InferenceOptionsForm value={null} onChange={() => {}} />);
    for (const cb of screen.getAllByRole("checkbox")) {
      expect(cb).toBeChecked();
    }
    expect(screen.queryByText(/\b(preset|balanced|lenient|strict mode)\b/i)).toBeNull();
  });
});
