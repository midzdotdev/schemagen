// JSON / NDJSON import. See docs/frontend-spec.md § "Importing records".

export type ImportSource = "json" | "ndjson";

export type ImportParseResult =
  | { ok: true; value: unknown; source: ImportSource }
  | { ok: false; error: string };

export function parseImport(text: string): ImportParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "empty input" };

  if (looksLikeNdjson(trimmed)) {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
    const items: unknown[] = [];
    for (const line of lines) {
      try {
        items.push(JSON.parse(line));
      } catch {
        // Fall back to JSON parse if any line fails
        return parseAsJson(trimmed);
      }
    }
    return { ok: true, value: items, source: "ndjson" };
  }
  return parseAsJson(trimmed);
}

function parseAsJson(text: string): ImportParseResult {
  try {
    return { ok: true, value: JSON.parse(text), source: "json" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "parse error" };
  }
}

function looksLikeNdjson(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return false;
  // Every line independently looks like a JSON object or array starter.
  return lines.every((l) => /^[\s]*[{[]/.test(l));
}

// Spec § "Importing records": refuse primitives and arrays of primitives.
export type RootCheck =
  | { ok: true; needsPicker: boolean; isArray: boolean }
  | { ok: false; error: string };

export function checkRoot(value: unknown): RootCheck {
  if (value === null || value === undefined) {
    return { ok: false, error: "value is null/undefined; expected an object or array of objects" };
  }
  if (typeof value !== "object") {
    return { ok: false, error: "value is a primitive; expected an object or array of objects" };
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return { ok: false, error: "empty array" };
    const allRecords = value.every((v) => v !== null && typeof v === "object" && !Array.isArray(v));
    if (allRecords) return { ok: true, needsPicker: false, isArray: true };
    const allPrimitive = value.every((v) => v === null || typeof v !== "object");
    if (allPrimitive) {
      return {
        ok: false,
        error: "array of primitives cannot be imported; expected array of objects",
      };
    }
    // Mixed array — needs root picker
    return { ok: true, needsPicker: true, isArray: true };
  }
  // Plain object — needs picker
  return { ok: true, needsPicker: true, isArray: false };
}
