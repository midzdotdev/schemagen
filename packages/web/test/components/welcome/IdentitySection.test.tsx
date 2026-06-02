// PR II — Identity section of the onboarding review page (was StepIdentity).
// IdentitySection is a controlled component: WizardHost owns `selected` and
// commits it on Generate, so this section never touches setIdentityConfig.
// Seeding and the Generate-commit semantics (plan II-I3/I5/I6) are exercised
// in ReviewPage.test.tsx. II-I7 (rich picker row labels) is deferred to the
// a11y sweep — see plan § "Out of scope".
//
// See docs/plans/pr-ii-onboarding-review-page.md.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { IdentitySection } from "@/components/welcome/IdentitySection";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
  act(() => {
    useStore.getState().setRecords([
      { id: 1, name: "Alice", role: "admin" },
      { id: 2, name: "Bob", role: "user" },
      { id: 1, name: "Alice (updated)", role: "admin" },
      { id: 3, name: "Charlie", role: "user" },
    ]);
  });
});

// Drives IdentitySection like WizardHost does — local state lifted up.
function Harness({ initial = [] as string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  return <IdentitySection selected={selected} onSelectedChange={setSelected} />;
}

describe("IdentitySection", () => {
  // Plan § "Page layout" — section named "Identity (optional)" wrapping the picker.
  it("II-I1: renders an Identity section with the primitive fields", () => {
    render(<Harness />);
    expect(screen.getByRole("region", { name: /identity \(optional\)/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /\bid\b/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /\bname\b/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /\brole\b/ })).toBeInTheDocument();
  });

  // Plan § "Resolved interpretations #5" — toggling never commits to the store.
  it("II-I2: toggling a field updates the selection without committing identityConfig", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("checkbox", { name: /\bid\b/ }));
    expect(screen.getByRole("checkbox", { name: /\bid\b/ })).toBeChecked();
    // The destructive store action never fired, and records are untouched.
    expect(useStore.getState().identityConfig).toBeNull();
    expect(useStore.getState().records).toHaveLength(4);
  });

  // Plan § "State + action surface" — the summary reports the key + its effect.
  it("II-I3: the summary reports the single key, its uniqueness, and the dedup effect", () => {
    render(<Harness initial={["id"]} />);
    const summary = screen.getByRole("status");
    expect(within(summary).getByText(/single field/i)).toBeInTheDocument();
    expect(within(summary).getByText(/% unique/i)).toBeInTheDocument();
    // id has 3 distinct values across 4 records → 3 distinct, 1 duplicate dropped.
    expect(within(summary).getByText(/3 distinct/i)).toBeInTheDocument();
    expect(within(summary).getByText(/1 duplicate/i)).toBeInTheDocument();
  });

  // A composite key is summarised as composite, with its combined uniqueness.
  it("II-I6: a composite key is labelled composite with its uniqueness", () => {
    render(<Harness initial={["id", "name"]} />);
    const summary = screen.getByRole("status");
    expect(within(summary).getByText(/composite/i)).toBeInTheDocument();
    expect(within(summary).getByText(/2 fields/i)).toBeInTheDocument();
    expect(within(summary).getByText(/% unique/i)).toBeInTheDocument();
  });

  // Plan § "Resolved interpretations #5" — empty selection wording + byte floor.
  it("II-I4: with no key, the summary keeps records distinct (byte-floor still applies)", () => {
    render(<Harness />);
    expect(screen.getByText(/no identity key/i)).toBeInTheDocument();
    expect(screen.getByText(/byte-identical/i)).toBeInTheDocument();
  });

  // Plan § "File-level edit map — IdentitySection" — nested-fields toggle.
  it("II-I5: 'Show nested fields' reveals non-primitive top-level fields", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setRecords([{ id: 1, meta: { region: "eu" } }]);
    });
    render(<Harness />);
    // The object field `meta` is hidden in the primitives-only default view.
    expect(screen.queryByText("meta")).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: /show nested fields/i }));
    expect(screen.getByText("meta")).toBeInTheDocument();
  });
});
