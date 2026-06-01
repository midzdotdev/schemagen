// Shared ingest pipeline used by ImportArea + DropZone. Takes a piece of text
// and a pair of callbacks for the "direct records" and "needs picker" cases.
//
// IngestResult also surfaces the parsed value and enumerated candidates so
// callers can stash them (e.g. for the wizard's "Pick a different root path"
// affordance). They're undefined when parsing failed.

import { checkRoot, parseImport } from "./json-import";
import { enumerateCandidates, type PickerCandidate } from "./root-picker";

export interface IngestResult {
  ok: boolean;
  error?: string;
  parsed?: unknown;
  candidates?: PickerCandidate[];
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
  const candidates = enumerateCandidates(parsed.value);
  if (!root.needsPicker && Array.isArray(parsed.value)) {
    onRecords(parsed.value);
    return { ok: true, parsed: parsed.value, candidates };
  }
  if (candidates.length === 0) {
    onRecords([parsed.value]);
    return { ok: true, parsed: parsed.value, candidates };
  }
  onNeedsPicker(parsed.value, candidates);
  return { ok: true, parsed: parsed.value, candidates };
}
