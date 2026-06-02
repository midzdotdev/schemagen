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
//
// Path segments are stored as strings (object keys) or strings of digits
// (array indices). The dialog's apply step converts `"0"` back to `0` so
// core's navigate() sees a number for array indexing.
export interface FieldTreeNode {
  segment: string; // last path segment — display form ("[0]" for arrays)
  path: string[]; // full path from root, stringified segments
  pathKey: string; // dot-joined; matches the selection format used by setIdentityConfig
  kind: FieldKind;
  presence: number; // fraction of records where the path resolves to non-null
  uniqueness: number; // fraction of records whose value at this path is unique
  children: FieldTreeNode[];
  // True when this row represents an array's element-0 step. The picker
  // styles it differently (label as `[0]`, dimmed) since it's a structural
  // hop rather than a user-visible key.
  isArrayIndex: boolean;
}

interface Bucket {
  path: string[];
  values: string[];
  kinds: Set<Exclude<FieldKind, "mixed" | "null">>;
  presentCount: number;
  childSegs: Set<string>;
  isArrayIndex: boolean; // true if this bucket represents an array's element-0 step
}

const DEFAULT_MAX_DEPTH = 6;

export function computeFieldTree(
  records: unknown[],
  maxDepth = DEFAULT_MAX_DEPTH,
): FieldTreeNode[] {
  if (records.length === 0) return [];
  const buckets = new Map<string, Bucket>();
  const rootChildren = new Set<string>();

  function ensureBucket(path: string[], isArrayIndex: boolean): Bucket {
    const key = path.join(".");
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        path,
        values: [],
        kinds: new Set(),
        presentCount: 0,
        childSegs: new Set(),
        isArrayIndex,
      };
      buckets.set(key, bucket);
    }
    return bucket;
  }

  function visit(value: unknown, path: string[], depth: number): void {
    if (depth > maxDepth) return;
    if (isRecord(value)) {
      const parentBucket = path.length === 0 ? null : buckets.get(path.join("."));
      for (const [k, v] of Object.entries(value)) {
        if (parentBucket) parentBucket.childSegs.add(k);
        else rootChildren.add(k);
        const childPath = [...path, k];
        const bucket = ensureBucket(childPath, false);
        record(bucket, v, childPath, depth);
      }
      return;
    }
    if (Array.isArray(value)) {
      // Walk element-0 only — represents "the first element" semantics. The
      // user picks a path that goes through arrays at their own risk; for
      // most records the first element is the representative shape.
      if (value.length === 0) return;
      const parentKey = path.join(".");
      const parentBucket = buckets.get(parentKey);
      if (parentBucket) parentBucket.childSegs.add("0");
      const childPath = [...path, "0"];
      const bucket = ensureBucket(childPath, true);
      const v0 = value[0];
      record(bucket, v0, childPath, depth);
    }
  }

  function record(bucket: Bucket, value: unknown, path: string[], depth: number): void {
    if (value === null || value === undefined) return;
    bucket.presentCount += 1;
    const kind = classify(value);
    bucket.kinds.add(kind);
    if (kind === "object" || kind === "array") {
      visit(value, path, depth + 1);
    } else {
      bucket.values.push(canonical(value));
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
      const displaySegment = bucket.isArrayIndex ? "[0]" : seg;
      nodes.push({
        segment: displaySegment,
        path: childPath,
        pathKey: childKey,
        kind,
        presence: bucket.presentCount / records.length,
        uniqueness: uniqueRecords / records.length,
        children: kind === "object" || kind === "array" ? build(childPath) : [],
        isArrayIndex: bucket.isArrayIndex,
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

// Convert a dot-joined pathKey to core's Path shape. Numeric-string segments
// become numbers so navigate() treats them as array indices.
export function pathKeyToCorePath(pathKey: string): (string | number)[] {
  return pathKey
    .split(".")
    .filter(Boolean)
    .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg));
}

// Composite-key uniqueness — uniqueness of the tuple (path1, path2, ...).
// Paths are dot-joined strings, supporting nested fields and array indices
// (e.g. "user.id", "tags.0.name").
export function compositeUniqueness(records: unknown[], paths: string[]): number {
  if (records.length === 0 || paths.length === 0) return 0;
  const pathArrays = paths.map(pathKeyToCorePath);
  const keys: string[] = [];
  for (const r of records) {
    if (r === null || r === undefined) continue;
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

function navigate(value: unknown, path: (string | number)[]): unknown {
  let cur: unknown = value;
  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof seg === "number") {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
      continue;
    }
    if (!isRecord(cur)) return undefined;
    cur = cur[seg];
  }
  return cur;
}
