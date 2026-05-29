// Canonical-stringify wrapper. See docs/frontend-spec.md § "Deduplication".

import stableStringify from "fast-json-stable-stringify";

export function canonicalHash(value: unknown): string {
  return stableStringify(value);
}
