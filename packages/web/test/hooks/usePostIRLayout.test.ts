// Persistence + validation for the post-IR three-pane layout hook.

import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_POST_IR_LAYOUT, usePostIRLayout } from "@/hooks/usePostIRLayout";

const KEY = "schemagen.postIRLayout.v1";

beforeEach(() => {
  window.localStorage.removeItem(KEY);
});
afterEach(() => {
  window.localStorage.removeItem(KEY);
});

describe("usePostIRLayout", () => {
  it("falls back to the default layout when localStorage is empty", () => {
    const { result } = renderHook(() => usePostIRLayout());
    expect(result.current[0]).toEqual(DEFAULT_POST_IR_LAYOUT);
  });

  it("persists a valid layout to localStorage and surfaces it on next mount", () => {
    const { result } = renderHook(() => usePostIRLayout());
    act(() => {
      result.current[1]({ records: 30, schema: 50, inspector: 20 });
    });
    expect(result.current[0]).toEqual({ records: 30, schema: 50, inspector: 20 });
    const raw = window.localStorage.getItem(KEY);
    expect(raw && JSON.parse(raw)).toEqual({ records: 30, schema: 50, inspector: 20 });
    // Second mount reads it back.
    const next = renderHook(() => usePostIRLayout());
    expect(next.result.current[0]).toEqual({ records: 30, schema: 50, inspector: 20 });
  });

  it("ignores malformed layouts (missing or non-numeric keys)", () => {
    const { result } = renderHook(() => usePostIRLayout());
    act(() => {
      // Wrong keys — should be a no-op.
      result.current[1]({ left: 30, center: 50, right: 20 });
    });
    expect(result.current[0]).toEqual(DEFAULT_POST_IR_LAYOUT);
  });
});
