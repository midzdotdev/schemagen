// findExamples. See docs/core-spec.md § "`findExamples`".

import type { IR, Path } from "../ir/types";
import type { RecordRef } from "./types";

export function findExamples(
  _ir: IR,
  samples: unknown[],
  path: Path,
  predicate?: (value: unknown) => boolean,
  limit = 5,
): RecordRef[] {
  const results: RecordRef[] = [];
  for (let i = 0; i < samples.length; i++) {
    if (results.length >= limit) break;
    const record = samples[i];
    const value = navigate(record, path);
    if (value === undefined) continue;
    if (predicate && !predicate(value)) continue;
    results.push({ index: i, record });
  }
  return results;
}

function navigate(value: unknown, path: Path): unknown {
  let current: unknown = value;
  for (const segment of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return undefined;
      if (segment < 0 || segment >= current.length) return undefined;
      current = current[segment];
      continue;
    }
    if (typeof current !== "object" || Array.isArray(current)) return undefined;
    const obj = current as Record<string, unknown>;
    if (!Object.hasOwn(obj, segment)) return undefined;
    current = obj[segment];
  }
  return current;
}
