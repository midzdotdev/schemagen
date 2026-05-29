// Derived state helpers. See docs/frontend-spec.md § "Schema tree".

import type { EvidenceTree, Mismatch, Path } from "@schemagen/core";

// Mismatch count for a path, including any descendant.
// Interpretation (plan §): NodeRow shows a count badge of mismatches at any
// path with this row's path as a prefix.
export function mismatchCountAtPath(mismatches: Mismatch[], path: Path): number {
  let count = 0;
  for (const m of mismatches) {
    if (isPathPrefix(path, m.path)) count++;
  }
  return count;
}

export function isPathPrefix(prefix: Path, candidate: Path): boolean {
  if (prefix.length > candidate.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] !== candidate[i]) return false;
  }
  return true;
}

export function pathsEqual(a: Path | null, b: Path | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Navigate an evidence tree alongside an IR path. Returns the evidence node
// at that path, or null if the path doesn't resolve.
export function evidenceAtPath(evidence: EvidenceTree | null, path: Path): EvidenceTree | null {
  if (!evidence) return null;
  let current: EvidenceTree | null = evidence;
  for (const seg of path) {
    if (!current) return null;
    current = stepEvidence(current, seg);
  }
  return current;
}

function stepEvidence(node: EvidenceTree, seg: string | number): EvidenceTree | null {
  switch (node.kind) {
    case "object":
      if (typeof seg !== "string") return null;
      return node.fields[seg]?.valueEvidence ?? null;
    case "array":
      if (seg === "items") return node.items;
      return null;
    case "tuple":
      if (seg === "rest") return node.rest ?? null;
      if (typeof seg === "number") return node.items[seg] ?? null;
      return null;
    case "union":
      if (typeof seg === "number") return node.variants[seg] ?? null;
      return null;
    case "record":
      if (seg === "values") return node.values;
      return null;
    default:
      return null;
  }
}

export function formatPath(path: Path): string {
  if (path.length === 0) return "(root)";
  return path
    .map((seg, i) => (typeof seg === "number" ? `[${seg}]` : i === 0 ? seg : `.${seg}`))
    .join("");
}
