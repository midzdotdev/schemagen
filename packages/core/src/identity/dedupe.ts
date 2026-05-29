// dedupeByIdentity. See docs/core-spec.md § "`dedupeByIdentity`".

import stringify from "safe-stable-stringify";
import type { Path } from "../ir/types";
import type { IdentityConfig } from "./types";

export type DropReason = "duplicate-identity" | "duplicate-record";

export interface DedupeResult {
  kept: unknown[];
  dropped: { record: unknown; reason: DropReason }[];
}

export function dedupeByIdentity(samples: unknown[], config: IdentityConfig): DedupeResult {
  if (config.onDuplicate === "keep-all") {
    // No logical (identity-key) dedup, but canonical byte-dedup still applies: records that are
    // value-identical (equal up to object key order) collapse to their first occurrence.
    // safe-stable-stringify is deterministic (sorts keys), giving each record a canonical hash.
    // See docs/core-spec.md § "Identity".
    const kept: unknown[] = [];
    const dropped: { record: unknown; reason: DropReason }[] = [];
    const seen = new Set<string>();
    for (const s of samples) {
      const hash = stringify(s) ?? "undefined";
      if (seen.has(hash)) {
        dropped.push({ record: s, reason: "duplicate-record" });
        continue;
      }
      seen.add(hash);
      kept.push(s);
    }
    return { kept, dropped };
  }

  const kept: unknown[] = [];
  const dropped: { record: unknown; reason: DropReason }[] = [];
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
