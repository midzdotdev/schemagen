import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useUIPref } from "@/hooks/useUIPrefs";

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
