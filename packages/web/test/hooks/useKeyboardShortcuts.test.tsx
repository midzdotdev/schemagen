import type { IR } from "@schemagen/core";
import { fireEvent, renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

const ir: IR = {
  kind: "object",
  fields: { id: { type: { kind: "string" } } },
  additional: false,
};

describe("useKeyboardShortcuts", () => {
  // Spec: docs/frontend-spec.md § "Keyboard shortcuts" — ⌘Z undoes
  it("X5-K1: Cmd+Z calls undo", () => {
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().applyChange({ op: "set-optional", path: [], name: "id", value: true });
    });
    renderHook(() => useKeyboardShortcuts());
    expect(useStore.getState().history.cursor).toBe(1);
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(useStore.getState().history.cursor).toBe(0);
  });

  // Spec: docs/frontend-spec.md § "Keyboard shortcuts" — ⌘⇧Z redoes
  it("X5-K2: Cmd+Shift+Z calls redo", () => {
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().applyChange({ op: "set-optional", path: [], name: "id", value: true });
      useStore.getState().undo();
    });
    renderHook(() => useKeyboardShortcuts());
    expect(useStore.getState().history.cursor).toBe(0);
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });
    expect(useStore.getState().history.cursor).toBe(1);
  });

  // Spec: docs/frontend-spec.md § "Keyboard shortcuts" — ⌘E toggles export modal
  it("X5-K3: Cmd+E calls onExportToggle", () => {
    const onExportToggle = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onExportToggle }));
    fireEvent.keyDown(window, { key: "e", metaKey: true });
    expect(onExportToggle).toHaveBeenCalledTimes(1);
  });

  // Spec: docs/frontend-spec.md § "Keyboard shortcuts" — Escape closes modal
  it("X5-K4: Escape calls onEscape", () => {
    const onEscape = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onEscape }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  // Spec: docs/frontend-spec.md § "Keyboard shortcuts" — shortcuts inert while editing
  it("X5-K5: Cmd+Z is ignored while typing in an input", () => {
    act(() => {
      useStore.getState().setIR(ir);
      useStore.getState().applyChange({ op: "set-optional", path: [], name: "id", value: true });
    });
    renderHook(() => useKeyboardShortcuts());
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: "z", metaKey: true });
    expect(useStore.getState().history.cursor).toBe(1); // unchanged
    document.body.removeChild(input);
  });
});
