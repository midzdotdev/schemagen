// PR II — Identity section of the onboarding review page (was StepIdentity).
// IdentitySection is a controlled component: ReviewPage owns `selected` and
// commits it on Generate, so this section never touches setIdentityConfig.
// Seeding and the Generate-commit semantics (plan II-I3/I5/I6) are exercised
// in ReviewPage.test.tsx. II-I7 (rich picker row labels) is deferred to the
// a11y sweep — see plan § "Out of scope".
//
// See docs/plans/pr-ii-onboarding-review-page.md.

import { render, screen } from "@testing-library/react";
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

// Drives IdentitySection like ReviewPage will — local state lifted up.
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

  // Plan § "State + action surface" — preview is local and reflects `selected`.
  it("II-I3: dedup preview reflects the selected field", () => {
    render(<Harness initial={["id"]} />);
    // id has 3 unique values across 4 records → 3 unique, 1 duplicate.
    expect(screen.getByText(/3 unique/i)).toBeInTheDocument();
    expect(screen.getByText(/1 duplicate/i)).toBeInTheDocument();
  });

  // Plan § "Resolved interpretations #5" — empty selection wording + byte floor.
  it("II-I4: preview reads 'No identity key selected' when nothing is chosen", () => {
    render(<Harness />);
    expect(screen.getByText(/no identity key selected/i)).toBeInTheDocument();
    expect(screen.getByText(/byte-identical records always collapse/i)).toBeInTheDocument();
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
