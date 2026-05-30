// proposeIdentityKey. See docs/core-spec.md § "`proposeIdentityKey`".

import type { Path } from "../ir/types";
import type { IdentityProposal } from "./types";

const UNIQUENESS_THRESHOLD = 0.95;
const PRESENCE_THRESHOLD = 0.95;

export function proposeIdentityKey(samples: unknown[]): IdentityProposal | null {
  if (samples.length === 0) return null;
  const fieldNames = collectTopLevelFields(samples);

  // Single-field candidates first: return the BEST qualifying single field, not the first.
  const singles: IdentityProposal[] = [];
  for (const f of fieldNames) {
    const r = evaluate([[f]], samples);
    if (r) singles.push(r);
  }
  const bestSingle = best(singles);
  if (bestSingle) return bestSingle;

  // Then pairs — again, the best qualifying pair.
  const pairs: IdentityProposal[] = [];
  for (let i = 0; i < fieldNames.length; i++) {
    for (let j = i + 1; j < fieldNames.length; j++) {
      const fa = fieldNames[i] as string;
      const fb = fieldNames[j] as string;
      const r = evaluate([[fa], [fb]], samples);
      if (r) pairs.push(r);
    }
  }
  const bestPair = best(pairs);
  if (bestPair) return bestPair;

  // Spec is explicit: do not try triples.
  return null;
}

// Highest confidence wins: uniqueness first, then presence. Strict comparison keeps the
// earliest (first-seen) candidate on ties, so selection is deterministic.
function best(candidates: IdentityProposal[]): IdentityProposal | null {
  let winner: IdentityProposal | null = null;
  for (const c of candidates) {
    if (winner === null || isBetter(c, winner)) winner = c;
  }
  return winner;
}

function isBetter(a: IdentityProposal, b: IdentityProposal): boolean {
  if (a.confidence.uniqueness !== b.confidence.uniqueness) {
    return a.confidence.uniqueness > b.confidence.uniqueness;
  }
  return a.confidence.presence > b.confidence.presence;
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
  const valueCounts = new Map<string, number>();
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
    const k = canonical(parts);
    valueCounts.set(k, (valueCounts.get(k) ?? 0) + 1);
  }
  const presence = presentCount / samples.length;
  // Uniqueness is the fraction of present records whose key value is unique to them
  // (occurs exactly once), per docs/core-spec.md. This is NOT distinct/total: a value
  // shared by N records is unique for none of them, contributing 0 — not 1.
  let uniqueRecords = 0;
  for (const count of valueCounts.values()) if (count === 1) uniqueRecords++;
  const uniqueness = presentCount === 0 ? 0 : uniqueRecords / presentCount;
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
    if (!Object.hasOwn(obj, seg)) return undefined;
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
