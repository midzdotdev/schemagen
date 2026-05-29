// Root picker. See docs/frontend-spec.md § "Root picker".
//
// Walks any non-primitive structure and lists every path whose value is
// an array of objects. Paths use the same shape as core's `Path` type:
// strings for object keys, numbers for array indices.

export type PickerPath = (string | number)[];

export interface PickerCandidate {
  path: PickerPath;
  recordCount: number;
  preview: unknown;
}

export function enumerateCandidates(value: unknown): PickerCandidate[] {
  const out: PickerCandidate[] = [];
  walk(value, [], out);
  return out;
}

function walk(value: unknown, path: PickerPath, out: PickerCandidate[]): void {
  if (Array.isArray(value)) {
    // If every element is an object (non-null, non-array), this is a candidate.
    if (value.length > 0 && value.every(isRecord)) {
      out.push({ path: [...path], recordCount: value.length, preview: value[0] });
    }
    // Always recurse to find nested arrays of objects.
    for (let i = 0; i < value.length; i++) {
      walk(value[i], [...path, i], out);
    }
    return;
  }
  if (isRecord(value)) {
    for (const [k, v] of Object.entries(value)) {
      walk(v, [...path, k], out);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getAtPath(value: unknown, path: PickerPath): unknown {
  let current: unknown = value;
  for (const seg of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof seg === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[seg];
      continue;
    }
    if (typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

export function formatPath(path: PickerPath): string {
  if (path.length === 0) return "(root)";
  return path
    .map((seg, i) => (typeof seg === "number" ? `[${seg}]` : i === 0 ? seg : `.${seg}`))
    .join("");
}
