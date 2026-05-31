import { Plus, Upload } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { shouldRenameWorkspace, workspaceNameFromFile } from "@/lib/filename";
import { checkRoot, parseImport } from "@/lib/json-import";
import type { PickerCandidate } from "@/lib/root-picker";
import { enumerateCandidates } from "@/lib/root-picker";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

export interface ImportAreaProps {
  onRecords: (records: unknown[]) => void;
  onNeedsPicker: (parsed: unknown, candidates: PickerCandidate[]) => void;
  // While true, disable Import + file inputs so the user can't enqueue a
  // second batch while the previous one is still being processed.
  ingesting?: boolean;
}

export function ImportArea({ onRecords, onNeedsPicker, ingesting = false }: ImportAreaProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const workspaceName = useStore((s) => s.workspaceName);
  const setWorkspaceName = useStore((s) => s.setWorkspaceName);

  function handleImport(): void {
    setError(null);
    const parsed = parseImport(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const root = checkRoot(parsed.value);
    if (!root.ok) {
      setError(root.error);
      return;
    }
    if (!root.needsPicker && Array.isArray(parsed.value)) {
      onRecords(parsed.value);
      setText("");
      return;
    }
    const candidates = enumerateCandidates(parsed.value);
    if (candidates.length === 0) {
      onRecords([parsed.value]);
      setText("");
      return;
    }
    onNeedsPicker(parsed.value, candidates);
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    if (shouldRenameWorkspace(workspaceName)) {
      setWorkspaceName(workspaceNameFromFile(file.name));
    }
    void file.text().then(setText);
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <label
        className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        htmlFor="import-text"
      >
        Paste JSON
      </label>
      <Textarea
        id="import-text"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'[{ "id": "a", "status": "active" }, ...]'}
        aria-label="Import text"
        className="resize-none text-xs leading-relaxed"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleImport}
          disabled={!text.trim() || ingesting}
          className="flex-1"
        >
          <Plus className="size-3.5" />
          Import
        </Button>
        <label>
          <input
            type="file"
            accept=".json,.ndjson,application/json"
            onChange={handleFile}
            className="sr-only"
            aria-label="Upload data file"
            disabled={ingesting}
          />
          <span
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Upload .json or .ndjson"
          >
            <Upload className="size-3.5" />
            File
          </span>
        </label>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
