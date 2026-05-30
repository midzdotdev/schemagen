import { FileUp, Plus, Upload } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { checkRoot, parseImport } from "../../lib/json-import";
import type { PickerCandidate } from "../../lib/root-picker";
import { enumerateCandidates } from "../../lib/root-picker";
import { parseSessionBundle } from "../../lib/session-bundle";
import { loadSessionBundle } from "../../state/init";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

export interface ImportAreaProps {
  onRecords: (records: unknown[]) => void;
  onNeedsPicker: (parsed: unknown, candidates: PickerCandidate[]) => void;
}

export function ImportArea({ onRecords, onNeedsPicker }: ImportAreaProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function handleImport(): void {
    setError(null);
    setInfo(null);
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
    void file.text().then(setText);
  }

  function handleImportSession(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setInfo(null);
    void file.text().then(async (raw) => {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch (err) {
        setError(err instanceof Error ? err.message : "could not parse session file");
        return;
      }
      const result = parseSessionBundle(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      try {
        const { workspaceId } = await loadSessionBundle(result.bundle);
        setInfo(`Imported session as workspace ${workspaceId.slice(0, 8)}.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "could not import session");
      }
    });
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
        <Button size="sm" onClick={handleImport} disabled={!text.trim()} className="flex-1">
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
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FileUp className="size-3" />
        <label className="cursor-pointer hover:text-foreground hover:underline">
          <input
            type="file"
            accept=".json,.session.json,application/json"
            onChange={handleImportSession}
            className="sr-only"
            aria-label="Import session file"
          />
          import session bundle
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
      {info && (
        <output className="block rounded-md bg-success/10 px-2 py-1.5 text-xs text-success">
          {info}
        </output>
      )}
    </div>
  );
}
