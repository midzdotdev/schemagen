// Drop a .json / .ndjson file anywhere in the data panel.
// Spec: docs/frontend-spec.md § "Importing records" — drag-and-drop.

import { type DragEvent, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { shouldRenameWorkspace, workspaceNameFromFile } from "../../lib/filename";
import { ingestText } from "../../lib/import-pipeline";
import type { PickerCandidate } from "../../lib/root-picker";
import { useStore } from "../../state/store";

export interface DropZoneProps {
  children: ReactNode;
  onRecords: (records: unknown[]) => void;
  onNeedsPicker: (parsed: unknown, candidates: PickerCandidate[]) => void;
  onError?: (msg: string) => void;
}

const ACCEPTED_EXTENSIONS = [".json", ".ndjson"];

export function DropZone({ children, onRecords, onNeedsPicker, onError }: DropZoneProps) {
  const [over, setOver] = useState(false);
  const workspaceName = useStore((s) => s.workspaceName);
  const setWorkspaceName = useStore((s) => s.setWorkspaceName);

  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setOver(true);
  }

  function handleDragLeave(): void {
    setOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      // Silent reject for unrecognized files — avoid hijacking other-app drops.
      return;
    }
    if (shouldRenameWorkspace(workspaceName)) {
      setWorkspaceName(workspaceNameFromFile(file.name));
    }
    void file.text().then((text) => {
      const result = ingestText(text, onRecords, onNeedsPicker);
      if (!result.ok && onError) onError(result.error ?? "could not import");
    });
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-drop file import is keyboard-accessible via the explicit file input above
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative h-full min-h-0",
        over && "outline outline-2 -outline-offset-[4px] outline-info",
      )}
      data-testid="data-dropzone"
    >
      {children}
      {over && (
        <output className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-info/15 text-sm font-medium text-info backdrop-blur-sm">
          Drop .json or .ndjson
        </output>
      )}
    </div>
  );
}

function hasFiles(e: DragEvent<HTMLDivElement>): boolean {
  return Array.from(e.dataTransfer.items).some((it) => it.kind === "file");
}
