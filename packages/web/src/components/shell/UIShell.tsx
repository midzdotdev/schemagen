// UIShell — owns the set of singleton modals (Export, Shortcuts, Reset
// workspace, Identity settings). Anywhere in the tree can openModal/closeModal
// via the context; only one of each lives in the tree (here).
//
// Before this, AppHeader threaded callbacks for each modal, App tracked
// individual open flags, and the keyboard-shortcut hook had to be wired with
// per-modal toggles. One context owns it all.

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { AddDataModal } from "../data-panel/AddDataModal";
import { RecordsModal } from "../data-panel/RecordsModal";
import { ExportModal } from "../export/ExportModal";
import { IdentityConfigDialog } from "../identity/IdentityConfigDialog";
import { InferenceOptionsDialog } from "../inference/InferenceOptionsDialog";
import { ReinferModal } from "../schema-tree/ReinferModal";
import { ShortcutsDialog } from "./ShortcutsDialog";

export type ModalName =
  | "export"
  | "shortcuts"
  | "identity"
  | "inference-options"
  | "add-data"
  | "records"
  | "reinfer";

interface UIShellContextValue {
  openModal: (name: ModalName) => void;
  closeModal: () => void;
  toggleModal: (name: ModalName) => void;
  // Read the currently-open modal name (null when none).
  currentModal: ModalName | null;
}

const UIShellContext = createContext<UIShellContextValue | null>(null);

export function useUIShell(): UIShellContextValue {
  const ctx = useContext(UIShellContext);
  if (!ctx) throw new Error("useUIShell must be used inside <UIShellProvider>");
  return ctx;
}

export function UIShellProvider({ children }: { children: ReactNode }) {
  // One open-modal slot keeps state simple; if we ever need overlapping
  // modals (rare in practice), this becomes a Set<ModalName>.
  const [current, setCurrent] = useState<ModalName | null>(null);

  const openModal = useCallback((name: ModalName) => setCurrent(name), []);
  const closeModal = useCallback(() => setCurrent(null), []);
  const toggleModal = useCallback(
    (name: ModalName) => setCurrent((c) => (c === name ? null : name)),
    [],
  );

  useKeyboardShortcuts({
    onExportToggle: () => toggleModal("export"),
    onShortcutsToggle: () => toggleModal("shortcuts"),
    onEscape: closeModal,
  });

  const value = useMemo<UIShellContextValue>(
    () => ({ openModal, closeModal, toggleModal, currentModal: current }),
    [openModal, closeModal, toggleModal, current],
  );

  // Each modal's open prop is just a function of `current`. onOpenChange
  // closes (Radix calls it with false on backdrop/escape/X). Dialogs that
  // need a richer onOpenChange (e.g. accept-only on success) own that logic
  // internally and call closeModal explicitly.
  return (
    <UIShellContext.Provider value={value}>
      {children}
      <ExportModal open={current === "export"} onOpenChange={(o) => !o && closeModal()} />
      <ShortcutsDialog open={current === "shortcuts"} onOpenChange={(o) => !o && closeModal()} />
      <IdentityConfigDialog
        open={current === "identity"}
        onOpenChange={(o) => !o && closeModal()}
      />
      <InferenceOptionsDialog
        open={current === "inference-options"}
        onOpenChange={(o) => !o && closeModal()}
      />
      <AddDataModal open={current === "add-data"} onOpenChange={(o) => !o && closeModal()} />
      <ReinferModal open={current === "reinfer"} onOpenChange={(o) => !o && closeModal()} />
      <RecordsModal open={current === "records"} onOpenChange={(o) => !o && closeModal()} />
    </UIShellContext.Provider>
  );
}
