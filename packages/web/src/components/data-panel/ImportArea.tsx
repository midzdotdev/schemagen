import { type ChangeEvent, useState } from "react";
import { checkRoot, parseImport } from "../../lib/json-import";
import type { PickerCandidate } from "../../lib/root-picker";
import { enumerateCandidates } from "../../lib/root-picker";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

export interface ImportAreaProps {
  onRecords: (records: unknown[]) => void;
  onNeedsPicker: (parsed: unknown, candidates: PickerCandidate[]) => void;
}

export function ImportArea({ onRecords, onNeedsPicker }: ImportAreaProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      return;
    }
    const candidates = enumerateCandidates(parsed.value);
    if (candidates.length === 0) {
      // Treat the parsed value as a single record.
      onRecords([parsed.value]);
      return;
    }
    onNeedsPicker(parsed.value, candidates);
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then(setText);
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <label className="text-xs font-medium text-[--color-muted-foreground]" htmlFor="import-text">
        Paste JSON / NDJSON
      </label>
      <Textarea
        id="import-text"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='[{"id":"a","status":"active"}, ...]'
        aria-label="Import text"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleImport} disabled={!text.trim()}>
          Import
        </Button>
        <label className="text-xs text-[--color-muted-foreground]">
          <input
            type="file"
            accept=".json,.ndjson,application/json"
            onChange={handleFile}
            className="hidden"
          />
          <span className="cursor-pointer underline">or upload file</span>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
