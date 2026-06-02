import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS, useUIPref, writeUIPrefBag } from "@/hooks/useUIPrefs";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("useUIPref", () => {
  it("returns the default when no value is stored", () => {
    const { result } = renderHook(() => useUIPref("ws-1", "schemaFilter"));
    expect(result.current[0]).toBe("");
  });

  it("setter writes to localStorage under the workspace-scoped key", () => {
    const { result } = renderHook(() => useUIPref("ws-1", "schemaFilter"));
    act(() => result.current[1]("status"));
    expect(result.current[0]).toBe("status");
    const raw = localStorage.getItem("schemagen.uiPrefs.ws-1");
    expect(JSON.parse(raw ?? "{}").schemaFilter).toBe("status");
  });

  it("re-hydrates on workspace change", () => {
    localStorage.setItem("schemagen.uiPrefs.ws-a", JSON.stringify({ schemaFilter: "from-a" }));
    localStorage.setItem("schemagen.uiPrefs.ws-b", JSON.stringify({ schemaFilter: "from-b" }));
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useUIPref(id, "schemaFilter"),
      {
        initialProps: { id: "ws-a" },
      },
    );
    expect(result.current[0]).toBe("from-a");
    rerender({ id: "ws-b" });
    expect(result.current[0]).toBe("from-b");
  });

  it("array values round-trip", () => {
    const { result } = renderHook(() => useUIPref("ws-1", "mismatchActiveKinds"));
    act(() => result.current[1](["literal-violation", "type-mismatch"]));
    expect(result.current[0]).toEqual(["literal-violation", "type-mismatch"]);
    // New hook instance hydrates the same value
    const { result: fresh } = renderHook(() => useUIPref("ws-1", "mismatchActiveKinds"));
    expect(fresh.current[0]).toEqual(["literal-violation", "type-mismatch"]);
  });

  it("silently survives malformed JSON in storage", () => {
    localStorage.setItem("schemagen.uiPrefs.ws-1", "not-json");
    const { result } = renderHook(() => useUIPref("ws-1", "schemaFilter"));
    expect(result.current[0]).toBe("");
  });
});

// PR II — onboarding review page. See docs/plans/pr-ii-onboarding-review-page.md.
describe("useUIPref — PR II onboarding prefs", () => {
  // Plan § "State + action surface — useUIPrefs additions"
  it("II-U1: onboardingCompleted and orientationHintDismissed default to false", () => {
    expect(DEFAULT_PREFS.onboardingCompleted).toBe(false);
    expect(DEFAULT_PREFS.orientationHintDismissed).toBe(false);
    const onboarding = renderHook(() => useUIPref("ws-1", "onboardingCompleted"));
    expect(onboarding.result.current[0]).toBe(false);
    const hint = renderHook(() => useUIPref("ws-1", "orientationHintDismissed"));
    expect(hint.result.current[0]).toBe(false);
  });

  // Plan § "Resolved interpretations #8" — legacy read-time fallback.
  it("II-U2: reads legacy wizardCompleted=true when onboardingCompleted is absent", () => {
    localStorage.setItem("schemagen.uiPrefs.ws-1", JSON.stringify({ wizardCompleted: true }));
    const { result } = renderHook(() => useUIPref("ws-1", "onboardingCompleted"));
    expect(result.current[0]).toBe(true);
  });

  // Plan § "Resolved interpretations #8" — `??` semantics preserve explicit-false legacy.
  it("II-U3: legacy wizardCompleted=false resolves to false, not the default", () => {
    localStorage.setItem("schemagen.uiPrefs.ws-1", JSON.stringify({ wizardCompleted: false }));
    const { result } = renderHook(() => useUIPref("ws-1", "onboardingCompleted"));
    expect(result.current[0]).toBe(false);
  });

  // Plan § "State + action surface — writeUIPrefBag"
  it("II-U4: writeUIPrefBag writes multiple keys in a single setItem and re-renders readers", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const onboarding = renderHook(() => useUIPref("ws-1", "onboardingCompleted"));
    const collapsed = renderHook(() => useUIPref("ws-1", "recordsSidebarCollapsed"));
    setItem.mockClear();
    act(() => {
      writeUIPrefBag("ws-1", { onboardingCompleted: true, recordsSidebarCollapsed: false });
    });
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(onboarding.result.current[0]).toBe(true);
    expect(collapsed.result.current[0]).toBe(false);
    setItem.mockRestore();
  });

  // Plan § "Resolved interpretations #8" — legacy key self-retires on write.
  it("II-U5: writeUIPrefBag strips the legacy wizardCompleted key from storage", () => {
    localStorage.setItem("schemagen.uiPrefs.ws-1", JSON.stringify({ wizardCompleted: true }));
    act(() => {
      writeUIPrefBag("ws-1", { onboardingCompleted: true });
    });
    const bag = JSON.parse(localStorage.getItem("schemagen.uiPrefs.ws-1") ?? "{}");
    expect(bag.wizardCompleted).toBeUndefined();
    expect(bag.onboardingCompleted).toBe(true);
  });

  // Plan § "State + action surface — writeUIPrefBag" — reads fresh, no stale-closure clobber.
  it("II-U6: writeUIPrefBag merges against fresh storage, not a stale hook snapshot", () => {
    const { result } = renderHook(() => useUIPref("ws-1", "schemaFilter"));
    act(() => result.current[1]("status"));
    // A sibling write through the bag helper must preserve the earlier schemaFilter.
    act(() => {
      writeUIPrefBag("ws-1", { orientationHintDismissed: true });
    });
    const bag = JSON.parse(localStorage.getItem("schemagen.uiPrefs.ws-1") ?? "{}");
    expect(bag.schemaFilter).toBe("status");
    expect(bag.orientationHintDismissed).toBe(true);
  });
});
