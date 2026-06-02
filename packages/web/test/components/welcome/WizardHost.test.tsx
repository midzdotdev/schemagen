// PR II (revised) — stepped onboarding wizard host.
// See docs/plans/pr-ii-revised-onboarding-wizard.md § "State + action surface".

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WizardHost } from "@/components/welcome/WizardHost";
import { useStore } from "@/state/store";

const RECORDS = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
];

beforeEach(() => {
  useStore.getState().resetForTests();
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function seed(records: unknown[] = RECORDS, workspaceId = "ws-wizard") {
  act(() => {
    useStore.getState().hydrate({ workspaceId });
    useStore.getState().setRecords(records);
  });
}

function stepperItems() {
  return within(screen.getByRole("list", { name: /onboarding steps/i })).getAllByRole("listitem");
}

const continueBtn = () => screen.getByRole("button", { name: /^continue$/i });
const generateBtn = () => screen.getByRole("button", { name: /generate schema/i });

describe("WizardHost", () => {
  // Plan § "State + action surface"
  it("Z-W1: opens on step 1 (Data) with Back disabled and a Continue button", () => {
    seed();
    render(<WizardHost />);
    expect(screen.getByRole("button", { name: /data/i })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("region", { name: /^data$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^back$/i })).toBeDisabled();
    expect(continueBtn()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate schema/i })).toBeNull();
  });

  it("Z-W2: Continue advances and marks done; Back returns; maxVisited never decrements", async () => {
    const user = userEvent.setup();
    seed();
    render(<WizardHost />);
    await user.click(continueBtn());
    expect(screen.getByRole("region", { name: /identity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /identity/i })).toHaveAttribute(
      "aria-current",
      "step",
    );
    // Data is now a completed, clickable step.
    expect(screen.getByRole("button", { name: /data/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /^back$/i }));
    expect(screen.getByRole("region", { name: /^data$/i })).toBeInTheDocument();
    // maxVisited stayed at 1 → Identity is still reachable by click.
    expect(screen.getByRole("button", { name: /identity/i })).toBeEnabled();
  });

  it("Z-W3: two Continues reach the inline Inference step with a Generate footer, no modal", async () => {
    const user = userEvent.setup();
    seed();
    render(<WizardHost />);
    await user.click(continueBtn());
    await user.click(continueBtn());
    expect(
      screen.getByRole("checkbox", { name: /recognise repeating values/i }),
    ).toBeInTheDocument();
    expect(generateBtn()).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Z-W4: footer shows Generate only on step 3; the stepper always has three items", async () => {
    const user = userEvent.setup();
    seed();
    render(<WizardHost />);
    expect(stepperItems()).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /generate schema/i })).toBeNull();
    await user.click(continueBtn());
    expect(stepperItems()).toHaveLength(3);
    await user.click(continueBtn());
    expect(stepperItems()).toHaveLength(3);
    expect(generateBtn()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^continue$/i })).toBeNull();
  });

  it("Z-W5: Generate infers first; a throw rolls back with no commit and an alert", async () => {
    const user = userEvent.setup();
    seed(RECORDS, "ws-w5");
    vi.spyOn(useStore.getState(), "inferSchema").mockImplementation(() => {
      throw new Error("boom");
    });
    const identitySpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    render(<WizardHost />);
    await user.click(continueBtn());
    await user.click(continueBtn());
    await user.click(generateBtn());
    expect(identitySpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/boom/i);
    expect(window.localStorage.getItem("schemagen.uiPrefs.ws-w5")).toBeNull();
  });

  it("Z-W6: Generate commits identity once then writes both prefs once", async () => {
    const user = userEvent.setup();
    seed(RECORDS, "ws-w6");
    const inferSpy = vi.spyOn(useStore.getState(), "inferSchema");
    const identitySpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    render(<WizardHost />);
    await user.click(continueBtn());
    await user.click(continueBtn());
    await user.click(generateBtn());
    expect(inferSpy).toHaveBeenCalledTimes(1);
    expect(identitySpy).toHaveBeenCalledTimes(1);
    const bag = JSON.parse(window.localStorage.getItem("schemagen.uiPrefs.ws-w6") ?? "{}");
    expect(bag.onboardingCompleted).toBe(true);
    expect(bag.recordsSidebarCollapsed).toBe(false);
  });

  it("Z-W7: double-clicking Generate commits exactly once", async () => {
    const user = userEvent.setup();
    seed(RECORDS, "ws-w7");
    const inferSpy = vi.spyOn(useStore.getState(), "inferSchema");
    const identitySpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    render(<WizardHost />);
    await user.click(continueBtn());
    await user.click(continueBtn());
    const btn = generateBtn();
    await user.click(btn);
    await user.click(btn);
    expect(inferSpy).toHaveBeenCalledTimes(1);
    expect(identitySpy).toHaveBeenCalledTimes(1);
  });

  it("Z-W8: the Generate label carries the top-level field count", async () => {
    const user = userEvent.setup();
    const reachStep3AndReadLabel = async (records: unknown[]) => {
      act(() => useStore.getState().resetForTests());
      window.localStorage.clear();
      seed(records);
      const view = render(<WizardHost />);
      await user.click(continueBtn());
      await user.click(continueBtn());
      const label = generateBtn().textContent ?? "";
      view.unmount();
      return label;
    };
    expect(await reachStep3AndReadLabel([{ a: 1, b: 2, c: 3, d: 4, e: 5 }])).toMatch(
      /\(5 fields\)/i,
    );
    expect(await reachStep3AndReadLabel([{ id: 1 }])).toMatch(/\(1 field\)/i);
    expect(await reachStep3AndReadLabel([1, 2, 3])).not.toMatch(/field/i);
  });

  it("Z-W9: identity is seeded from the proposed key and survives navigation", async () => {
    const user = userEvent.setup();
    seed();
    render(<WizardHost />);
    await user.click(continueBtn()); // → Identity
    expect(screen.getByRole("checkbox", { name: /\bid\b/ })).toBeChecked();
    await user.click(continueBtn()); // → Inference
    await user.click(screen.getByRole("button", { name: /identity/i })); // jump back
    expect(screen.getByRole("checkbox", { name: /\bid\b/ })).toBeChecked();
    // Not committed yet.
    expect(useStore.getState().identityConfig).toBeNull();
  });

  it("Z-W10: untouched-empty skips the identity commit; touched-empty commits {fields:[]}", async () => {
    const user = userEvent.setup();
    // Array-of-primitives → no selectable fields, nothing proposed.
    seed([1, 2, 3], "ws-w10a");
    const skipSpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    const { unmount } = render(<WizardHost />);
    await user.click(continueBtn());
    await user.click(continueBtn());
    await user.click(generateBtn());
    expect(skipSpy).not.toHaveBeenCalled();
    unmount();

    act(() => useStore.getState().resetForTests());
    window.localStorage.clear();
    seed(RECORDS, "ws-w10b");
    const commitSpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    render(<WizardHost />);
    await user.click(continueBtn()); // → Identity
    for (const cb of screen.getAllByRole("checkbox") as HTMLInputElement[]) {
      if (cb.checked) await user.click(cb);
    }
    await user.click(continueBtn()); // → Inference
    await user.click(generateBtn());
    expect(commitSpy).toHaveBeenCalledWith({ fields: [] });
  });

  it("Z-W11: re-picking the records root resets the staged selection", async () => {
    const user = userEvent.setup();
    seed();
    render(<WizardHost />);
    await user.click(continueBtn()); // → Identity
    expect(screen.getByRole("checkbox", { name: /\bid\b/ })).toBeChecked();
    // Simulate a root re-pick (DataSection's Change → setRecords) with no unique key.
    act(() => useStore.getState().setRecords([{ tag: "x" }, { tag: "x" }]));
    expect(screen.getByRole("checkbox", { name: /\btag\b/ })).not.toBeChecked();
  });

  it("Z-W12: an Identity↔Inference nav loop still commits identity exactly once", async () => {
    const user = userEvent.setup();
    seed(RECORDS, "ws-w12");
    const identitySpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    render(<WizardHost />);
    await user.click(continueBtn()); // → Identity
    await user.click(continueBtn()); // → Inference
    await user.click(screen.getByRole("button", { name: /identity/i })); // back to Identity
    await user.click(continueBtn()); // → Inference again
    await user.click(generateBtn());
    expect(identitySpy).toHaveBeenCalledTimes(1);
  });
});
