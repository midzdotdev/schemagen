// Shared colour palette for primitive types.
//
// Matches the JsonView token palette so anywhere the user sees "this is a
// string" / "this is a number" the colour cue is the same. Extended with
// neutral colours for compound kinds (object, array) and an amber accent
// for "mixed" so the picker can flag heterogeneous fields.

import type { FieldKind } from "./field-stats";

// Tailwind class for foreground text — used for the type label / chip text.
export const TYPE_TEXT: Record<FieldKind, string> = {
  string: "text-emerald-600 dark:text-emerald-400",
  number: "text-sky-600 dark:text-sky-400",
  boolean: "text-violet-600 dark:text-violet-400",
  null: "text-violet-600 dark:text-violet-400",
  object: "text-foreground/70",
  array: "text-foreground/70",
  mixed: "text-amber-600 dark:text-amber-400",
};

// Tailwind class for low-opacity background — used behind type chips.
export const TYPE_BG: Record<FieldKind, string> = {
  string: "bg-emerald-500/15",
  number: "bg-sky-500/15",
  boolean: "bg-violet-500/15",
  null: "bg-violet-500/15",
  object: "bg-muted",
  array: "bg-muted",
  mixed: "bg-amber-500/15",
};
