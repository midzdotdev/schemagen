// dedupeByIdentity. See docs/core-spec.md § "`dedupeByIdentity`".

import type { Path } from "../ir/types";
import type { IdentityConfig } from "./types";

export interface DedupeResult {
  kept: unknown[];
  dropped: { record: unknown; reason: "duplicate-identity" }[];
}

export function dedupeByIdentity(samples: unknown[], config: IdentityConfig): DedupeResult {
  if (config.onDuplicate === "keep-all") {
    return { kept: samples.slice(), dropped: [] };
  }

  const kept: unknown[] = [];
  const dropped: { record: unknown; reason: "duplicate-identity" }[] = [];
  const seenKeyToIndex = new Map<string, number>();

  for (const s of samples) {
    const key = extractKey(s, config.fields);
    if (key === null) {
      kept.push(s);
      continue;
    }

    const existingIdx = seenKeyToIndex.get(key);
    if (existingIdx === undefined) {
      seenKeyToIndex.set(key, kept.length);
      kept.push(s);
      continue;
    }

    if (config.onDuplicate === "replace") {
      const replaced = kept[existingIdx];
      kept[existingIdx] = s;
      dropped.push({ record: replaced, reason: "duplicate-identity" });
    } else {
      // skip
      dropped.push({ record: s, reason: "duplicate-identity" });
    }
  }

  return { kept, dropped };
}

function extractKey(record: unknown, fields: Path[]): string | null {
  const parts: unknown[] = [];
  for (const path of fields) {
    const v = navigate(record, path);
    if (v === undefined) return null;
    parts.push(v);
  }
  return JSON.stringify(parts);
}

function navigate(value: unknown, path: Path): unknown {
  let current: unknown = value;
  for (const seg of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof seg === "number") {
      if (!Array.isArray(current)) return undefined;
      if (seg < 0 || seg >= current.length) return undefined;
      current = current[seg];
      continue;
    }
    if (typeof current !== "object" || Array.isArray(current)) return undefined;
    const obj = current as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(obj, seg)) return undefined;
    current = obj[seg];
  }
  return current;
}
