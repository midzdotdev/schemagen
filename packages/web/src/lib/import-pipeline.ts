// Shared ingest pipeline used by ImportArea + DropZone. Takes a piece of text
// and a pair of callbacks for the "direct records" and "needs picker" cases.

import { checkRoot, parseImport } from "./json-import";
import { type PickerCandidate, enumerateCandidates } from "./root-picker";

export interface IngestResult {
  ok: boolean;
  error?: string;
}

export function ingestText(
  text: string,
  onRecords: (records: unknown[]) => void,
  onNeedsPicker: (parsed: unknown, candidates: PickerCandidate[]) => void,
): IngestResult {
  const parsed = parseImport(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const root = checkRoot(parsed.value);
  if (!root.ok) return { ok: false, error: root.error };
  if (!root.needsPicker && Array.isArray(parsed.value)) {
    onRecords(parsed.value);
    return { ok: true };
  }
  const candidates = enumerateCandidates(parsed.value);
  if (candidates.length === 0) {
    onRecords([parsed.value]);
    return { ok: true };
  }
  onNeedsPicker(parsed.value, candidates);
  return { ok: true };
}
