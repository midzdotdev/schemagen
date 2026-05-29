// proposeIdentityKey. See docs/core-spec.md § "`proposeIdentityKey`".

import type { Path } from "../ir/types";
import type { IdentityProposal } from "./types";

const UNIQUENESS_THRESHOLD = 0.95;
const PRESENCE_THRESHOLD = 0.95;

export function proposeIdentityKey(samples: unknown[]): IdentityProposal | null {
  if (samples.length === 0) return null;
  const fieldNames = collectTopLevelFields(samples);

  // Single-field candidates first
  for (const f of fieldNames) {
    const r = evaluate([[f]], samples);
    if (r) return r;
  }

  // Then pairs
  for (let i = 0; i < fieldNames.length; i++) {
    for (let j = i + 1; j < fieldNames.length; j++) {
      const fa = fieldNames[i] as string;
      const fb = fieldNames[j] as string;
      const r = evaluate([[fa], [fb]], samples);
      if (r) return r;
    }
  }

  // Spec is explicit: do not try triples.
  return null;
}

function collectTopLevelFields(samples: unknown[]): string[] {
  const seen: string[] = [];
  const set = new Set<string>();
  for (const s of samples) {
    if (s === null || typeof s !== "object" || Array.isArray(s)) continue;
    for (const k of Object.keys(s as Record<string, unknown>)) {
      if (!set.has(k)) {
        set.add(k);
        seen.push(k);
      }
    }
  }
  return seen;
}

function evaluate(fields: Path[], samples: unknown[]): IdentityProposal | null {
  let presentCount = 0;
  const values = new Set<string>();
  for (const s of samples) {
    const parts: unknown[] = [];
    let allPresent = true;
    for (const path of fields) {
      const v = navigate(s, path);
      if (v === undefined) {
        allPresent = false;
        break;
      }
      parts.push(v);
    }
    if (!allPresent) continue;
    presentCount++;
    values.add(canonical(parts));
  }
  const presence = presentCount / samples.length;
  const uniqueness = presentCount === 0 ? 0 : values.size / presentCount;
  if (presence >= PRESENCE_THRESHOLD && uniqueness >= UNIQUENESS_THRESHOLD) {
    return {
      fields,
      confidence: { uniqueness, presence },
      rationale: rationaleFor(fields, presence, uniqueness),
    };
  }
  return null;
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

function canonical(parts: unknown[]): string {
  return JSON.stringify(parts);
}

function rationaleFor(fields: Path[], presence: number, uniqueness: number): string {
  const label = fields.map((p) => p.join(".")).join(" + ");
  return `Field '${label}' is unique in ${pct(uniqueness)} of records and present in ${pct(presence)}`;
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
