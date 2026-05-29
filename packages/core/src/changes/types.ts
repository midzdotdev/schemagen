// Change union. See docs/core-spec.md § "Suggestions and Changes".
//
// The dispatcher (`applyChange`) and per-op handlers arrive in Phase 4;
// this file declares the types so `validate`'s suggestion factories can
// construct Change objects without depending on the dispatcher.

import type { FieldEntry, Node, Path } from "../ir/types";

export type Change =
  | { op: "set-node"; path: Path; node: Node }
  | { op: "set-field-type"; path: Path; type: Node }
  | { op: "add-field"; path: Path; name: string; entry: FieldEntry; position?: number }
  | { op: "remove-field"; path: Path; name: string }
  | { op: "rename-field"; path: Path; from: string; to: string }
  | { op: "reorder-fields"; path: Path; order: string[] }
  | { op: "set-optional"; path: Path; name: string; value: boolean }
  | { op: "set-nullable"; path: Path; name: string; value: boolean }
  | { op: "add-literal"; path: Path; value: string | number | boolean }
  | { op: "remove-literal"; path: Path; value: string | number | boolean }
  | { op: "clear-literals"; path: Path }
  | { op: "set-format"; path: Path; format: string | null }
  | { op: "set-pattern"; path: Path; pattern: string | null }
  | {
      op: "set-bound";
      path: Path;
      which: "min" | "max" | "minLength" | "maxLength" | "minItems" | "maxItems";
      value: number | null;
    }
  | { op: "set-integer"; path: Path; value: boolean }
  | { op: "wrap-in-union"; path: Path; with: Node }
  | { op: "add-union-variant"; path: Path; variant: Node }
  | { op: "remove-union-variant"; path: Path; index: number }
  | { op: "set-discriminator"; path: Path; field: string | null }
  | { op: "wrap-in-array"; path: Path }
  | { op: "unwrap-array"; path: Path }
  | { op: "set-additional"; path: Path; value: false | true | Node }
  | { op: "batch"; changes: Change[]; label?: string };
