// Global keyboard shortcuts. Mounted once by App.
// Spec: docs/frontend-spec.md § "Keyboard shortcuts" (subset).

import { useEffect } from "react";
import { useStore } from "../state/store";

export interface ShortcutHandlers {
  onExportToggle?: () => void;
  onShortcutsToggle?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}): void {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Don't override shortcuts when the user is editing an input.
      const target = e.target as HTMLElement | null;
      const inEditable =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if (meta && key === "z" && !e.shiftKey) {
        if (inEditable) return;
        e.preventDefault();
        undo();
        return;
      }
      if (meta && key === "z" && e.shiftKey) {
        if (inEditable) return;
        e.preventDefault();
        redo();
        return;
      }
      if (meta && key === "e") {
        e.preventDefault();
        handlers.onExportToggle?.();
        return;
      }
      // ? — open the shortcuts help dialog. Note: '?' is Shift+/ on most
      // layouts; we read e.key directly so layout-mapping is the browser's
      // problem. Stands down while typing in an input.
      if (e.key === "?" && !meta) {
        if (inEditable) return;
        e.preventDefault();
        handlers.onShortcutsToggle?.();
        return;
      }
      if (e.key === "Escape") {
        handlers.onEscape?.();
      }
    }
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [undo, redo, handlers.onExportToggle, handlers.onShortcutsToggle, handlers.onEscape]);
}
