import type { IR } from "@schemagen/core";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { useValidation } from "../../src/hooks/useValidation";
import { useStore } from "../../src/state/store";

const ir: IR = {
  kind: "object",
  fields: { id: { type: { kind: "string" } } },
  additional: false,
};

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("useValidation", () => {
  // Spec: docs/frontend-spec.md § "Mismatch panel"
  it("W3-V1: returns ok:true when no IR is set", () => {
    const { result } = renderHook(() => useValidation());
    expect(result.current.ok).toBe(true);
    expect(result.current.mismatches).toEqual([]);
  });

  // Spec: docs/frontend-spec.md § "Mismatch panel"
  it("W3-V2: returns mismatches when records violate the IR", () => {
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().setRecords([{ id: 42 }]); // id should be string
    });
    const { result } = renderHook(() => useValidation());
    expect(result.current.ok).toBe(false);
    expect(result.current.mismatches.length).toBeGreaterThan(0);
  });
});
