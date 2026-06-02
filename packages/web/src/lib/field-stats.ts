// Per-field presence + uniqueness stats for the identity-key picker.
//
// `computeFieldStats` walks records top-level only — kept for any caller
// that wants a flat list of immediate keys.
//
// `computeFieldTree` recurses into nested objects so the identity picker
// can offer nested paths (e.g. `user.id`). Arrays are treated as opaque —
// schemagen doesn't reach inside them for identity-key candidates.

export type FieldKind = "string" | "number" | "boolean" | "object" | "array" | "null" | "mixed";

export interface FieldStat {
  name: string;
  presence: number; // fraction of records where the field is present and non-null
  uniqueness: number; // fraction of records whose value is unique across the set
  // Runtime type observed for the field's values. "null" means every observed
  // value was null/undefined; "mixed" means more than one non-null kind appeared.
  kind: FieldKind;
}

export function computeFieldStats(records: unknown[]): FieldStat[] {
  if (records.length === 0) return [];
  const names = new Set<string>();
  for (const r of records) {
    if (isRecord(r)) for (const k of Object.keys(r)) names.add(k);
  }
  const out: FieldStat[] = [];
  for (const name of names) {
    const values: string[] = [];
    const observedKinds = new Set<Exclude<FieldKind, "mixed" | "null">>();
    let present = 0;
    for (const r of records) {
      if (!isRecord(r)) continue;
      const v = r[name];
      if (v === undefined || v === null) continue;
      present += 1;
      values.push(canonical(v));
      observedKinds.add(classify(v));
    }
    const seen = new Map<string, number>();
    for (const v of values) seen.set(v, (seen.get(v) ?? 0) + 1);
    const uniqueRecords = values.filter((v) => seen.get(v) === 1).length;
    out.push({
      name,
      presence: present / records.length,
      uniqueness: records.length === 0 ? 0 : uniqueRecords / records.length,
      kind:
        observedKinds.size === 0
          ? "null"
          : observedKinds.size === 1
            ? // biome-ignore lint/style/noNonNullAssertion: size === 1 guarantees one element
              observedKinds.values().next().value!
            : "mixed",
    });
  }
  out.sort(
    (a, b) => b.uniqueness * b.presence - a.uniqueness * a.presence || a.name.localeCompare(b.name),
  );
  return out;
}

// Tree node returned by computeFieldTree. Primitive leaves are selectable as
// identity keys; container nodes are browsable but can't be picked.
export interface FieldTreeNode {
  segment: string; // last path segment
  path: string[]; // full path from root
  pathKey: string; // dot-joined; matches the selection format used by setIdentityConfig
  kind: FieldKind;
  presence: number; // fraction of records where the path resolves to non-null
  uniqueness: number; // fraction of records whose value at this path is unique
  children: FieldTreeNode[];
}

interface Bucket {
  path: string[];
  values: string[];
  kinds: Set<Exclude<FieldKind, "mixed" | "null">>;
  presentCount: number;
  childSegs: Set<string>;
}

const DEFAULT_MAX_DEPTH = 5;

export function computeFieldTree(
  records: unknown[],
  maxDepth = DEFAULT_MAX_DEPTH,
): FieldTreeNode[] {
  if (records.length === 0) return [];
  const buckets = new Map<string, Bucket>();
  const rootChildren = new Set<string>();

  function visit(value: unknown, path: string[], depth: number): void {
    if (depth > maxDepth) return;
    if (!isRecord(value)) return;
    const parentKey = path.join(".");
    const parentBucket = path.length === 0 ? null : buckets.get(parentKey);
    for (const [k, v] of Object.entries(value)) {
      const childPath = [...path, k];
      const childKey = childPath.join(".");
      let bucket = buckets.get(childKey);
      if (!bucket) {
        bucket = {
          path: childPath,
          values: [],
          kinds: new Set(),
          presentCount: 0,
          childSegs: new Set(),
        };
        buckets.set(childKey, bucket);
      }
      if (parentBucket) parentBucket.childSegs.add(k);
      else rootChildren.add(k);

      if (v === null || v === undefined) continue;
      bucket.presentCount += 1;
      const kind = classify(v);
      bucket.kinds.add(kind);
      if (kind === "object") {
        visit(v, childPath, depth + 1);
      } else if (kind === "string" || kind === "number" || kind === "boolean") {
        bucket.values.push(canonical(v));
      }
      // Arrays: opaque. Recorded as kind=array on the bucket, not traversed.
    }
  }

  for (const r of records) visit(r, [], 0);

  function build(parentPath: string[]): FieldTreeNode[] {
    const parentKey = parentPath.join(".");
    const childSegs =
      parentPath.length === 0 ? rootChildren : (buckets.get(parentKey)?.childSegs ?? new Set());
    const nodes: FieldTreeNode[] = [];
    for (const seg of childSegs) {
      const childPath = [...parentPath, seg];
      const childKey = childPath.join(".");
      const bucket = buckets.get(childKey);
      if (!bucket) continue;
      const kind: FieldKind =
        bucket.kinds.size === 0
          ? "null"
          : bucket.kinds.size === 1
            ? // biome-ignore lint/style/noNonNullAssertion: size === 1 guarantees one element
              bucket.kinds.values().next().value!
            : "mixed";
      const seen = new Map<string, number>();
      for (const v of bucket.values) seen.set(v, (seen.get(v) ?? 0) + 1);
      const uniqueRecords = bucket.values.filter((v) => seen.get(v) === 1).length;
      nodes.push({
        segment: seg,
        path: childPath,
        pathKey: childKey,
        kind,
        presence: bucket.presentCount / records.length,
        uniqueness: uniqueRecords / records.length,
        children: kind === "object" ? build(childPath) : [],
      });
    }
    // Best-candidates-first ordering: primitives before containers; among
    // primitives, highest (uniqueness * presence) wins.
    nodes.sort((a, b) => {
      const aPrim = isPrimitiveKind(a.kind);
      const bPrim = isPrimitiveKind(b.kind);
      if (aPrim !== bPrim) return aPrim ? -1 : 1;
      if (aPrim) {
        const score = b.uniqueness * b.presence - a.uniqueness * a.presence;
        if (score !== 0) return score;
      }
      return a.segment.localeCompare(b.segment);
    });
    return nodes;
  }

  return build([]);
}

// Composite-key uniqueness — uniqueness of the tuple (path1, path2, ...).
// Paths are dot-joined strings, supporting nested fields (e.g. "user.id").
export function compositeUniqueness(records: unknown[], paths: string[]): number {
  if (records.length === 0 || paths.length === 0) return 0;
  const pathArrays = paths.map((p) => p.split(".").filter(Boolean));
  const keys: string[] = [];
  for (const r of records) {
    if (!isRecord(r)) continue;
    const parts = pathArrays.map((p) => canonical(navigate(r, p)));
    keys.push(parts.join(" "));
  }
  const seen = new Map<string, number>();
  for (const k of keys) seen.set(k, (seen.get(k) ?? 0) + 1);
  const uniq = keys.filter((k) => seen.get(k) === 1).length;
  return uniq / records.length;
}

// Primitives can serve as identity keys; objects/arrays/mixed can't be reasoned
// about reliably (JSON-string equality is fragile; mixed runtime types compare
// unpredictably). Null fields are present-zero anyway.
export const PRIMITIVE_KINDS: readonly FieldKind[] = ["string", "number", "boolean"];
export function isPrimitiveKind(k: FieldKind): boolean {
  return PRIMITIVE_KINDS.includes(k);
}

function classify(v: unknown): Exclude<FieldKind, "mixed" | "null"> {
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") return "object";
  if (typeof v === "string") return "string";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  return "object";
}

function canonical(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return `${typeof v}:${String(v)}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function navigate(value: unknown, path: string[]): unknown {
  let cur: unknown = value;
  for (const seg of path) {
    if (!isRecord(cur)) return undefined;
    cur = cur[seg];
    if (cur === undefined) return undefined;
  }
  return cur;
}
