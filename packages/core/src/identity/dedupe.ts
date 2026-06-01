// dedupeByIdentity / dedupeByteIdentical. See docs/core-spec.md § "Identity".

import stringify from "safe-stable-stringify";
import type { Path } from "../ir/types";
import type { IdentityConfig } from "./types";

export type DropReason = "duplicate-identity" | "duplicate-record";

export interface DedupeResult {
  kept: unknown[];
  dropped: { record: unknown; reason: DropReason }[];
}

// Collapses records that are value-identical (equal up to object key order)
// into their first occurrence. safe-stable-stringify is deterministic
// (sorts keys), giving each record a canonical hash.
//
// Use this as the dedup floor when there is no identity config; identity
// config already subsumes this behaviour via its key-based dedup, so callers
// don't need to run both.
export function dedupeByteIdentical(samples: unknown[]): DedupeResult {
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

// Dedup by identity key. Newest occurrence wins per identity — the later
// record overwrites the earlier one at the same key.
//
// Records missing any of the identity fields fall back to byte-dedup: a
// literal re-import of an "identity-less" record still collapses. The
// stringify cost is paid only on the null-key fall-through, so payloads
// where every record has the key see the fast key-only path.
export function dedupeByIdentity(samples: unknown[], config: IdentityConfig): DedupeResult {
  const kept: unknown[] = [];
  const dropped: { record: unknown; reason: DropReason }[] = [];
  const seenKeyToIndex = new Map<string, number>();
  const seenNullKeyHash = new Set<string>();

  for (const s of samples) {
    const key = extractKey(s, config.fields);
    if (key === null) {
      const hash = stringify(s) ?? "undefined";
      if (seenNullKeyHash.has(hash)) {
        dropped.push({ record: s, reason: "duplicate-record" });
        continue;
      }
      seenNullKeyHash.add(hash);
      kept.push(s);
      continue;
    }

    const existingIdx = seenKeyToIndex.get(key);
    if (existingIdx === undefined) {
      seenKeyToIndex.set(key, kept.length);
      kept.push(s);
      continue;
    }

    const replaced = kept[existingIdx];
    kept[existingIdx] = s;
    dropped.push({ record: replaced, reason: "duplicate-identity" });
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
    if (!Object.hasOwn(obj, seg)) return undefined;
    current = obj[seg];
  }
  return current;
}
