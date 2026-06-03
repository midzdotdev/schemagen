// PR FF — re-infer diff. Compares the user's current IR against a freshly
// inferred IR and splits the changes into "auto" (paths the user never edited,
// safe to apply) and "conflict" (paths the user touched, where inference
// competes with their intent). Pure: the caller supplies the touched-path set
// (computed from history in the web layer, where `source` lives).
//
// See docs/plans/pr-ff-reinfer-reconcile.md.

import type { Change } from "../changes/types";
import type { IR, Node, Path } from "../ir/types";

export interface ConflictChange {
  change: Change;
  // The node the user currently has at this path (null for an added field —
  // e.g. a field they previously removed that inference re-adds).
  existing: Node | null;
}

export interface ReinferDiff {
  autoChanges: Change[];
  conflictChanges: ConflictChange[];
}

// `["foo", 0, "bar"]` → `"foo.0.bar"`. Numeric (array-index) segments stringify.
export function serializePath(path: Path): string {
  return path.map(String).join(".");
}

// The serialized paths a change targets, for touched-set membership. Field ops
// target the field itself (object path + name); node ops target their path; a
// batch flattens to its members.
export function changeTargetPaths(change: Change): string[] {
  switch (change.op) {
    case "add-field":
    case "remove-field":
    case "set-optional":
    case "set-nullable":
      return [serializePath([...change.path, change.name])];
    case "rename-field":
      return [
        serializePath([...change.path, change.from]),
        serializePath([...change.path, change.to]),
      ];
    case "batch":
      return change.changes.flatMap(changeTargetPaths);
    default:
      return [serializePath(change.path)];
  }
}

export function computeReinferDiff(current: IR, fresh: IR, touched: Set<string>): ReinferDiff {
  const autoChanges: Change[] = [];
  const conflictChanges: ConflictChange[] = [];

  function classify(change: Change, existing: Node | null): void {
    const conflict = changeTargetPaths(change).some((p) => touched.has(p));
    if (conflict) conflictChanges.push({ change, existing });
    else autoChanges.push(change);
  }

  function diff(path: Path, cur: Node, frsh: Node): void {
    if (nodesEqual(cur, frsh)) return;

    if (cur.kind === "object" && frsh.kind === "object") {
      // Removed fields — present now, gone in the fresh inference.
      for (const name of Object.keys(cur.fields)) {
        if (!(name in frsh.fields)) {
          classify({ op: "remove-field", path, name }, cur.fields[name]?.type ?? null);
        }
      }
      // Added fields — newly inferred.
      for (const name of Object.keys(frsh.fields)) {
        if (!(name in cur.fields)) {
          const entry = frsh.fields[name];
          if (entry) classify({ op: "add-field", path, name, entry }, null);
        }
      }
      // Common fields — optionality, nullability, then the type itself.
      for (const name of Object.keys(cur.fields)) {
        const c = cur.fields[name];
        const f = frsh.fields[name];
        if (!c || !f) continue;
        if ((c.optional ?? false) !== (f.optional ?? false)) {
          classify({ op: "set-optional", path, name, value: f.optional ?? false }, c.type);
        }
        if ((c.nullable ?? false) !== (f.nullable ?? false)) {
          classify({ op: "set-nullable", path, name, value: f.nullable ?? false }, c.type);
        }
        diff([...path, name], c.type, f.type);
      }
      if (!additionalEqual(cur.additional, frsh.additional)) {
        classify({ op: "set-additional", path, value: frsh.additional }, cur);
      }
      return;
    }

    // Different kinds, or non-object leaves whose constraints changed: replace
    // the whole node. v1 is coarse here — finer literal/bound diffs can come
    // later if the conflict UI proves too blunt.
    classify({ op: "set-node", path, node: frsh }, cur);
  }

  diff([], current, fresh);
  return { autoChanges, conflictChanges };
}

// A conflict can sometimes be reconciled by keeping *both* sides rather than
// picking one — when the user broadened a type and the fresh inference broadened
// it differently. `mergeNodes` returns the join (the least type that satisfies
// both) when that's a meaningful "lose nothing" merge, or null when it isn't —
// either the kinds don't line up, or the fresh side adds nothing new (Keep
// already covers it), or the difference is a genuine either/or (format, pattern,
// bounds, flags) that can't be unioned. The reconcile modal offers a third
// "Merge" choice exactly when this returns non-null.
//
// Covered today: literal unions (union the value sets) and type unions (union
// the variant lists). Bounds-widening and object-field merges are deliberately
// out — see docs/plans/pr-ff-reinfer-reconcile.md.
export function mergeNodes(current: Node, fresh: Node): Node | null {
  if (current.kind !== fresh.kind) return null;

  // Literal unions — union the observed value sets (per kind so the literal
  // element types line up).
  if (current.kind === "string" && fresh.kind === "string") {
    return mergedLiterals(current, current.literals, fresh.literals);
  }
  if (current.kind === "number" && fresh.kind === "number") {
    return mergedLiterals(current, current.literals, fresh.literals);
  }
  if (current.kind === "boolean" && fresh.kind === "boolean") {
    return mergedLiterals(current, current.literals, fresh.literals);
  }

  // Type unions — union the variant lists (deduped structurally).
  if (current.kind === "union" && fresh.kind === "union") {
    const seen = new Set(current.variants.map((v) => JSON.stringify(canon(v))));
    const variants = [...current.variants];
    for (const v of fresh.variants) {
      const key = JSON.stringify(canon(v));
      if (!seen.has(key)) {
        seen.add(key);
        variants.push(v);
      }
    }
    if (variants.length === current.variants.length) return null;
    return { ...current, variants };
  }

  return null;
}

// Returns the node with its literals widened to the union, or null when the
// fresh side contributes nothing new (or either side isn't a literal union).
function mergedLiterals<N extends Node, T extends string | number | boolean>(
  node: N,
  cur: T[] | undefined,
  frsh: T[] | undefined,
): Node | null {
  if (!cur || !frsh) return null;
  const seen = new Set(cur.map(String));
  const out = [...cur];
  for (const v of frsh) {
    if (!seen.has(String(v))) {
      seen.add(String(v));
      out.push(v);
    }
  }
  if (out.length === cur.length) return null; // fresh added nothing new
  // Safe: the caller guarantees `node` is the literal-bearing kind for `T`.
  return { ...node, literals: out } as Node;
}

type ObjectAdditional = false | true | Node;

function additionalEqual(a: ObjectAdditional, b: ObjectAdditional): boolean {
  if (typeof a === "object" && typeof b === "object") return nodesEqual(a, b);
  return a === b;
}

// Structural equality, order-insensitive for object fields and union variants
// (the user may have reordered; inference emits its own order). Canonicalises
// each node to a stable string and compares.
function nodesEqual(a: Node, b: Node): boolean {
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

function canon(node: Node): unknown {
  switch (node.kind) {
    case "object": {
      const fields: Record<string, unknown> = {};
      for (const name of Object.keys(node.fields).sort()) {
        const fe = node.fields[name];
        if (!fe) continue;
        fields[name] = {
          type: canon(fe.type),
          optional: fe.optional ?? false,
          nullable: fe.nullable ?? false,
        };
      }
      return {
        kind: "object",
        fields,
        additional: typeof node.additional === "object" ? canon(node.additional) : node.additional,
      };
    }
    case "union": {
      const variants = node.variants.map((v) => JSON.stringify(canon(v))).sort();
      return { kind: "union", variants, discriminator: node.discriminator ?? null };
    }
    case "array":
      return {
        kind: "array",
        items: canon(node.items),
        minItems: node.minItems ?? null,
        maxItems: node.maxItems ?? null,
        uniqueItems: node.uniqueItems ?? false,
      };
    case "tuple":
      return {
        kind: "tuple",
        items: node.items.map(canon),
        rest: node.rest ? canon(node.rest) : null,
      };
    case "record":
      return { kind: "record", values: canon(node.values), keyPattern: node.keyPattern ?? null };
    case "number":
      return {
        kind: "number",
        integer: node.integer ?? false,
        min: node.min ?? null,
        max: node.max ?? null,
        literals: [...(node.literals ?? [])].sort(),
      };
    case "string":
      return {
        kind: "string",
        format: node.format ?? null,
        pattern: node.pattern ?? null,
        minLength: node.minLength ?? null,
        maxLength: node.maxLength ?? null,
        literals: [...(node.literals ?? [])].sort(),
      };
    case "boolean":
      return { kind: "boolean", literals: [...(node.literals ?? [])].sort() };
    default:
      return { kind: node.kind };
  }
}
