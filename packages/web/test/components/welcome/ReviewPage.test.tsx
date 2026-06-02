// PR II — onboarding review page host. See docs/plans/pr-ii-onboarding-review-page.md.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UIShellProvider } from "@/components/shell/UIShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReviewPage } from "@/components/welcome/ReviewPage";
import { useStore } from "@/state/store";

function renderReview() {
  return render(
    <TooltipProvider>
      <UIShellProvider>
        <ReviewPage />
      </UIShellProvider>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  useStore.getState().resetForTests();
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("ReviewPage", () => {
  // Plan § "Resolved interpretations #1" — single page, sections + footer in order.
  it("II-R1: renders header, Data, Identity, the inference line, and a Generate footer", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1, name: "a" }]);
    });
    renderReview();
    expect(screen.getByRole("heading", { name: /review your data/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /^data$/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /identity \(optional\)/i })).toBeInTheDocument();
    expect(screen.getByText(/^inference:/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adjust/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate schema/i })).toBeInTheDocument();
  });

  // Plan § "Resolved interpretations #4" — field-count parenthetical.
  it("II-R2: Generate label uses the top-level field count", () => {
    act(() => {
      useStore.getState().setRecords([{ a: 1, b: 2, c: 3, d: 4, e: 5 }]);
    });
    const { unmount } = renderReview();
    expect(
      screen.getByRole("button", { name: /generate schema \(5 fields\)/i }),
    ).toBeInTheDocument();
    unmount();

    act(() => {
      useStore.getState().resetForTests();
      useStore.getState().setRecords([{ id: 1 }]);
    });
    const single = renderReview();
    expect(
      screen.getByRole("button", { name: /generate schema \(1 field\)/i }),
    ).toBeInTheDocument();
    single.unmount();

    // Array-of-primitives root → no top-level fields → no parenthetical.
    act(() => {
      useStore.getState().resetForTests();
      useStore.getState().setRecords([1, 2, 3]);
    });
    renderReview();
    const btn = screen.getByRole("button", { name: /generate schema/i });
    expect(btn.textContent).not.toMatch(/field/i);
  });

  // Plan § "Resolved interpretations #5/#6" — one inferSchema, one identity commit,
  // one merged UIPref write.
  it("II-R3: Generate infers once, commits identity once, writes prefs once", async () => {
    const user = userEvent.setup();
    const workspaceId = "ws-r3";
    act(() => {
      useStore.getState().hydrate({ workspaceId });
      useStore.getState().setRecords([{ id: 1, name: "a" }]);
    });
    const inferSpy = vi.spyOn(useStore.getState(), "inferSchema");
    const identitySpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    renderReview();
    await user.click(screen.getByRole("button", { name: /generate schema/i }));
    expect(inferSpy).toHaveBeenCalledTimes(1);
    expect(identitySpy).toHaveBeenCalledTimes(1);
    // Both prefs land in the one bag (the single-setItem atomicity is II-U4).
    const bag = JSON.parse(window.localStorage.getItem(`schemagen.uiPrefs.${workspaceId}`) ?? "{}");
    expect(bag.onboardingCompleted).toBe(true);
    expect(bag.recordsSidebarCollapsed).toBe(false);
  });

  // Plan § "Resolved interpretations #6" — inferSchema throws ⇒ clean rollback.
  it("II-R4: when inferSchema throws, nothing commits and an error shows", async () => {
    const user = userEvent.setup();
    const workspaceId = "ws-r4";
    act(() => {
      useStore.getState().hydrate({ workspaceId });
      useStore.getState().setRecords([{ id: 1, name: "a" }]);
    });
    vi.spyOn(useStore.getState(), "inferSchema").mockImplementation(() => {
      throw new Error("boom");
    });
    const identitySpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    renderReview();
    await user.click(screen.getByRole("button", { name: /generate schema/i }));
    expect(identitySpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/boom/i);
    expect(window.localStorage.getItem(`schemagen.uiPrefs.${workspaceId}`)).toBeNull();
  });

  // Plan § "Resolved interpretations #6" — double-click is idempotent.
  it("II-R5: double-clicking Generate commits exactly once", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().hydrate({ workspaceId: "ws-r5" });
      useStore.getState().setRecords([{ id: 1, name: "a" }]);
    });
    const inferSpy = vi.spyOn(useStore.getState(), "inferSchema");
    const identitySpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    renderReview();
    const btn = screen.getByRole("button", { name: /generate schema/i });
    await user.click(btn);
    await user.click(btn);
    expect(inferSpy).toHaveBeenCalledTimes(1);
    expect(identitySpy).toHaveBeenCalledTimes(1);
  });

  // Plan § "Resolved interpretations #5" — seed from the proposed identity key.
  it("II-I3: seeds the identity selection from the proposed key", () => {
    act(() => {
      useStore.getState().setRecords([
        { id: 1, name: "a" },
        { id: 2, name: "b" },
        { id: 3, name: "c" },
      ]);
    });
    renderReview();
    // `id` is fully unique → proposed and pre-checked.
    expect(screen.getByRole("checkbox", { name: /\bid\b/ })).toBeChecked();
  });

  // Plan § "Resolved interpretations #5" — no primitive fields ⇒ skip the commit.
  it("II-I5: Generate skips setIdentityConfig when no field is selected", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().hydrate({ workspaceId: "ws-i5" });
      // Array-of-primitives: no selectable fields, nothing proposed.
      useStore.getState().setRecords([1, 2, 3]);
    });
    const identitySpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    renderReview();
    await user.click(screen.getByRole("button", { name: /generate schema/i }));
    expect(identitySpy).not.toHaveBeenCalled();
    expect(useStore.getState().ir).not.toBeNull();
  });

  // Plan § "Resolved interpretations #5" — touched-to-empty commits an empty key.
  it("II-I6: clearing the seed then Generating commits an empty identity config", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().hydrate({ workspaceId: "ws-i6" });
      useStore.getState().setRecords([
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ]);
    });
    const identitySpy = vi.spyOn(useStore.getState(), "setIdentityConfig");
    renderReview();
    // Untick the seeded proposal, then generate.
    for (const cb of screen.getAllByRole("checkbox") as HTMLInputElement[]) {
      if (cb.checked) await user.click(cb);
    }
    await user.click(screen.getByRole("button", { name: /generate schema/i }));
    expect(identitySpy).toHaveBeenCalledWith({ fields: [] });
  });

  // Plan § "Resolved interpretations #5" — root re-pick resets the selection.
  it("II-R7: changing the record set resets the staged selection", () => {
    act(() => {
      useStore.getState().setRecords([
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ]);
    });
    renderReview();
    expect(screen.getByRole("checkbox", { name: /\bid\b/ })).toBeChecked();
    // Re-pick a differently-shaped root with no unique key → nothing proposed.
    act(() => {
      useStore.getState().setRecords([{ tag: "x" }, { tag: "x" }]);
    });
    expect(screen.getByRole("checkbox", { name: /\btag\b/ })).not.toBeChecked();
  });

  // Plan § "Resolved interpretations #2" — Adjust opens the inference dialog.
  it("II-R9: the Adjust link opens the inference options dialog", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setRecords([{ id: 1, name: "a" }]);
    });
    renderReview();
    expect(screen.queryByRole("dialog", { name: /inference options/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: /adjust/i }));
    expect(screen.getByRole("dialog", { name: /inference options/i })).toBeInTheDocument();
  });
});
