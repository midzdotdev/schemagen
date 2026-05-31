// Spec: docs/frontend-spec.md § "Resizable panes"

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PANE_LAYOUT, usePaneLayout } from "@/hooks/usePaneLayout";

const STORAGE_KEY = "schemagen.paneLayout.v1";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("usePaneLayout", () => {
  // Interpretation: with no prior pane layout stored, the hook seeds the
  // panel group with sensible defaults so the first paint isn't blank.
  it("W-1: returns defaults when no value is stored", () => {
    const { result } = renderHook(() => usePaneLayout());
    expect(result.current[0]).toEqual(DEFAULT_PANE_LAYOUT);
  });

  // Interpretation: Group's onLayoutChanged hands back the layout map every
  // settle; we round-trip it to localStorage so the next reload restores the
  // user's tuning.
  it("W-2: persists complete layouts to localStorage", () => {
    const { result } = renderHook(() => usePaneLayout());
    act(() => {
      result.current[1]({ data: 30, schema: 50, inspector: 20 });
    });
    expect(result.current[0]).toEqual({ data: 30, schema: 50, inspector: 20 });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      data: 30,
      schema: 50,
      inspector: 20,
    });
  });

  // Interpretation: a stored layout from a previous session should be the
  // initial value, not the default. Means reloads don't flash the default
  // first.
  it("W-3: reads a previously-stored layout on mount", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: 18, schema: 64, inspector: 18 }));
    const { result } = renderHook(() => usePaneLayout());
    expect(result.current[0]).toEqual({ data: 18, schema: 64, inspector: 18 });
  });

  // Interpretation: if a partial layout ever arrives (PanelGroup hadn't
  // mounted all panels yet, an external caller passed wrong shape), drop it
  // — keeping the old layout is better than writing garbage.
  it("W-4: ignores writes missing required panel keys", () => {
    const { result } = renderHook(() => usePaneLayout());
    act(() => {
      result.current[1]({ data: 50, schema: 50 });
    });
    expect(result.current[0]).toEqual(DEFAULT_PANE_LAYOUT);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
