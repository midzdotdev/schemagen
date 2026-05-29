// useValidation. Runs core's validate against the current records,
// memoized on (ir, records) reference equality.
// See docs/frontend-spec.md § "Mismatch panel".

import { type ValidationResult, validate } from "@schemagen/core";
import { useMemo } from "react";
import { useStore } from "../state/store";

export function useValidation(): ValidationResult {
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  return useMemo<ValidationResult>(() => {
    if (!ir) return { ok: true, mismatches: [] };
    try {
      return validate(ir, records);
    } catch {
      // Structurally-invalid IR; the UI will surface this elsewhere.
      return { ok: false, mismatches: [] };
    }
  }, [ir, records]);
}
