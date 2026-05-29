import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { Change } from "../../src/changes/types";
import { isValid } from "../../src/ir/structure";
import type { IR, Node, ObjectNode, Path, UnionNode } from "../../src/ir/types";

// Spec: docs/core-spec.md § "Invertibility"
//
// For each op family, generate (valid IR, valid op-params) and assert:
//   applyChange(applyChange(ir, c).ir, inverse).ir  deep-equals  ir.

// ----- arbitraries -----

const NUM_RUNS = 500;

// Number leaves sometimes carry an explicit `integer` flag — including `integer: false`, which
// must survive a set-integer round-trip (a regression guard for the absent-vs-explicit-false bug).
const numberLeafArb: fc.Arbitrary<Node> = fc
  .option(fc.boolean(), { nil: undefined })
  .map<Node>((integer) =>
    integer === undefined ? { kind: "number" } : { kind: "number", integer },
  );

// Leaf nodes — simple, depth-0.
const leafArb: fc.Arbitrary<Node> = fc.oneof(
  fc.constant<Node>({ kind: "unknown" }),
  fc.constant<Node>({ kind: "null" }),
  fc.constant<Node>({ kind: "boolean" }),
  numberLeafArb,
  fc.constant<Node>({ kind: "string" }),
);

// Field name arbitrary — short, simple, avoids collisions in tiny shapes.
const fieldNameArb = fc
  .string({ minLength: 1, maxLength: 4 })
  .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));

// Recursive node arbitrary, depth-bounded to keep test fast.
function nodeArb(depth: number): fc.Arbitrary<Node> {
  if (depth <= 0) return leafArb;
  const sub = nodeArb(depth - 1);
  return fc.oneof(
    { weight: 4, arbitrary: leafArb },
    {
      weight: 1,
      arbitrary: sub.map<Node>((items) => ({ kind: "array", items })),
    },
    {
      weight: 1,
      arbitrary: fc
        // Field entries sometimes carry explicit optional/nullable flags (incl. `false`), which
        // must survive set-optional/set-nullable round-trips.
        .uniqueArray(
          fc.tuple(
            fieldNameArb,
            sub,
            fc.option(fc.boolean(), { nil: undefined }),
            fc.option(fc.boolean(), { nil: undefined }),
          ),
          { minLength: 1, maxLength: 3, selector: ([k]) => k },
        )
        .map<Node>((entries) => {
          const fields: Record<string, { type: Node; optional?: boolean; nullable?: boolean }> = {};
          for (const [k, v, opt, nul] of entries) {
            fields[k] = {
              type: v,
              ...(opt !== undefined ? { optional: opt } : {}),
              ...(nul !== undefined ? { nullable: nul } : {}),
            };
          }
          return { kind: "object", fields, additional: false };
        }),
    },
    {
      weight: 1,
      arbitrary: fc
        .tuple(fc.array(sub, { minLength: 1, maxLength: 3 }), fc.option(sub, { nil: undefined }))
        .map<Node>(([items, rest]) =>
          rest === undefined ? { kind: "tuple", items } : { kind: "tuple", items, rest },
        ),
    },
    {
      weight: 1,
      arbitrary: fc
        .array(sub, { minLength: 2, maxLength: 3 })
        .map<Node>((variants) => ({ kind: "union", variants })),
    },
    {
      weight: 1,
      arbitrary: sub.map<Node>((values) => ({ kind: "record", values })),
    },
  );
}

const irArb = nodeArb(3).filter((ir) => isValid(ir));

// ----- traversal helpers -----

type Loc = { path: Path; node: Node };

function allLocations(ir: Node): Loc[] {
  const out: Loc[] = [];
  walk(ir, [], out);
  return out;
}

function walk(node: Node, path: Path, out: Loc[]): void {
  out.push({ path, node });
  switch (node.kind) {
    case "object":
      for (const [name, entry] of Object.entries(node.fields)) {
        walk(entry.type, [...path, name], out);
      }
      break;
    case "array":
      walk(node.items, [...path, "items"], out);
      break;
    case "tuple":
      for (let i = 0; i < node.items.length; i++) {
        walk(node.items[i] as Node, [...path, i], out);
      }
      if (node.rest) walk(node.rest, [...path, "rest"], out);
      break;
    case "union":
      for (let i = 0; i < node.variants.length; i++) {
        walk(node.variants[i] as Node, [...path, i], out);
      }
      break;
    case "record":
      walk(node.values, [...path, "values"], out);
      break;
  }
}

function findNodes<K extends Node["kind"]>(
  ir: Node,
  kind: K,
): Array<{ path: Path; node: Extract<Node, { kind: K }> }> {
  const all = allLocations(ir);
  return all
    .filter((l) => l.node.kind === kind)
    .map((l) => ({ path: l.path, node: l.node as Extract<Node, { kind: K }> }));
}

// Roundtrip checker.
function expectInvertible(ir: IR, change: Change): void {
  const r = applyChange(ir, change);
  const back = applyChange(r.ir, r.inverse);
  expect(back.ir).toEqual(ir);
}

// ----- property tests -----

describe("applyChange invertibility (property)", () => {
  // C_IV1: For each op family, ≥500 cases: applyChange(applyChange(ir, c).ir, inverse).ir === ir

  it("C_IV1 set-node: roundtrips", () => {
    fc.assert(
      fc.property(irArb, nodeArb(2).filter(isValid), fc.integer(), (ir, replacement, seed) => {
        const locs = allLocations(ir);
        const loc = locs[Math.abs(seed) % locs.length] as Loc;
        expectInvertible(ir, { op: "set-node", path: loc.path, node: replacement });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 set-field-type: roundtrips at any path", () => {
    fc.assert(
      fc.property(irArb, nodeArb(2).filter(isValid), fc.integer(), (ir, replacement, seed) => {
        const locs = allLocations(ir);
        const loc = locs[Math.abs(seed) % locs.length] as Loc;
        expectInvertible(ir, { op: "set-field-type", path: loc.path, type: replacement });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 add-field: roundtrips", () => {
    fc.assert(
      fc.property(
        irArb,
        nodeArb(1).filter(isValid),
        fieldNameArb,
        fc.integer(),
        fc.option(fc.nat(5), { nil: undefined }),
        (ir, t, name, seed, pos) => {
          const objs = findNodes(ir, "object");
          if (objs.length === 0) return;
          const target = objs[Math.abs(seed) % objs.length] as {
            path: Path;
            node: ObjectNode;
          };
          if (Object.prototype.hasOwnProperty.call(target.node.fields, name)) return;
          const existing = Object.keys(target.node.fields).length;
          const change: Change =
            pos === undefined
              ? {
                  op: "add-field",
                  path: target.path,
                  name,
                  entry: { type: t },
                }
              : {
                  op: "add-field",
                  path: target.path,
                  name,
                  entry: { type: t },
                  position: pos > existing ? existing : pos,
                };
          expectInvertible(ir, change);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 remove-field: roundtrips", () => {
    fc.assert(
      fc.property(irArb, fc.integer(), fc.integer(), (ir, seedObj, seedField) => {
        const objs = findNodes(ir, "object").filter((o) => Object.keys(o.node.fields).length > 0);
        if (objs.length === 0) return;
        const target = objs[Math.abs(seedObj) % objs.length] as {
          path: Path;
          node: ObjectNode;
        };
        const keys = Object.keys(target.node.fields);
        const name = keys[Math.abs(seedField) % keys.length] as string;
        expectInvertible(ir, { op: "remove-field", path: target.path, name });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 rename-field: roundtrips", () => {
    fc.assert(
      fc.property(irArb, fieldNameArb, fc.integer(), fc.integer(), (ir, to, seedObj, seedField) => {
        const objs = findNodes(ir, "object").filter((o) => Object.keys(o.node.fields).length > 0);
        if (objs.length === 0) return;
        const target = objs[Math.abs(seedObj) % objs.length] as {
          path: Path;
          node: ObjectNode;
        };
        const keys = Object.keys(target.node.fields);
        const from = keys[Math.abs(seedField) % keys.length] as string;
        if (Object.prototype.hasOwnProperty.call(target.node.fields, to) && from !== to) return;
        expectInvertible(ir, {
          op: "rename-field",
          path: target.path,
          from,
          to,
        });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 reorder-fields: roundtrips when object has >= 2 fields", () => {
    fc.assert(
      fc.property(irArb, fc.integer(), fc.integer(), (ir, seedObj, seedPerm) => {
        const objs = findNodes(ir, "object").filter((o) => Object.keys(o.node.fields).length >= 2);
        if (objs.length === 0) return;
        const target = objs[Math.abs(seedObj) % objs.length] as {
          path: Path;
          node: ObjectNode;
        };
        const keys = Object.keys(target.node.fields);
        // Build a deterministic permutation via seed.
        const perm = keys.slice();
        let s = Math.abs(seedPerm) || 1;
        for (let i = perm.length - 1; i > 0; i--) {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          const j = s % (i + 1);
          [perm[i], perm[j]] = [perm[j] as string, perm[i] as string];
        }
        expectInvertible(ir, { op: "reorder-fields", path: target.path, order: perm });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 set-optional / set-nullable: roundtrip", () => {
    fc.assert(
      fc.property(
        irArb,
        fc.boolean(),
        fc.boolean(),
        fc.integer(),
        fc.integer(),
        (ir, flagPick, value, seedObj, seedField) => {
          const objs = findNodes(ir, "object").filter((o) => Object.keys(o.node.fields).length > 0);
          if (objs.length === 0) return;
          const target = objs[Math.abs(seedObj) % objs.length] as {
            path: Path;
            node: ObjectNode;
          };
          const keys = Object.keys(target.node.fields);
          const name = keys[Math.abs(seedField) % keys.length] as string;
          const change: Change = flagPick
            ? { op: "set-optional", path: target.path, name, value }
            : { op: "set-nullable", path: target.path, name, value };
          expectInvertible(ir, change);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 add-literal / remove-literal / clear-literals: roundtrip on string nodes", () => {
    fc.assert(
      fc.property(
        irArb,
        fc.string({ maxLength: 5 }),
        fc.integer(),
        fc.nat(2),
        (ir, lit, seed, pick) => {
          const strs = findNodes(ir, "string");
          if (strs.length === 0) return;
          const target = strs[Math.abs(seed) % strs.length] as { path: Path };
          const change: Change =
            pick === 0
              ? { op: "add-literal", path: target.path, value: lit }
              : pick === 1
                ? { op: "remove-literal", path: target.path, value: lit }
                : { op: "clear-literals", path: target.path };
          expectInvertible(ir, change);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 set-format: roundtrip", () => {
    fc.assert(
      fc.property(
        irArb,
        fc.option(fc.constantFrom("email", "uuid", "iso-date"), { nil: null }),
        fc.integer(),
        (ir, format, seed) => {
          const strs = findNodes(ir, "string");
          if (strs.length === 0) return;
          const target = strs[Math.abs(seed) % strs.length] as { path: Path };
          expectInvertible(ir, { op: "set-format", path: target.path, format });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 set-pattern: roundtrip on string and record nodes", () => {
    fc.assert(
      fc.property(
        irArb,
        fc.option(fc.constantFrom("^a$", "^[a-z]+$"), { nil: null }),
        fc.integer(),
        (ir, pattern, seed) => {
          const candidates = [...findNodes(ir, "string"), ...findNodes(ir, "record")];
          if (candidates.length === 0) return;
          const target = candidates[Math.abs(seed) % candidates.length] as { path: Path };
          expectInvertible(ir, { op: "set-pattern", path: target.path, pattern });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 set-bound: roundtrip", () => {
    const whichArb = fc.constantFrom(
      "min",
      "max",
      "minLength",
      "maxLength",
      "minItems",
      "maxItems",
    ) as fc.Arbitrary<"min" | "max" | "minLength" | "maxLength" | "minItems" | "maxItems">;
    fc.assert(
      fc.property(
        irArb,
        whichArb,
        fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
        fc.integer(),
        (ir, which, value, seed) => {
          // Pick a node consistent with the bound, otherwise the dispatcher
          // would set the bound on a node where it's structurally undefined
          // (e.g. min on a string). We confine each `which` to its applicable
          // node kind to keep IRs valid after the op.
          let candidates: Array<{ path: Path }>;
          if (which === "min" || which === "max") candidates = findNodes(ir, "number");
          else if (which === "minLength" || which === "maxLength")
            candidates = findNodes(ir, "string");
          else candidates = findNodes(ir, "array");
          if (candidates.length === 0) return;
          const target = candidates[Math.abs(seed) % candidates.length] as { path: Path };
          expectInvertible(ir, { op: "set-bound", path: target.path, which, value });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 set-integer: roundtrip", () => {
    fc.assert(
      fc.property(irArb, fc.boolean(), fc.integer(), (ir, value, seed) => {
        const nums = findNodes(ir, "number");
        if (nums.length === 0) return;
        const target = nums[Math.abs(seed) % nums.length] as { path: Path };
        expectInvertible(ir, { op: "set-integer", path: target.path, value });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 wrap-in-union / wrap-in-array / unwrap-array: roundtrip", () => {
    fc.assert(
      fc.property(
        irArb,
        nodeArb(1).filter(isValid),
        fc.integer(),
        fc.nat(2),
        (ir, withNode, seed, pick) => {
          const locs = allLocations(ir);
          if (pick === 0) {
            const target = locs[Math.abs(seed) % locs.length] as Loc;
            expectInvertible(ir, {
              op: "wrap-in-union",
              path: target.path,
              with: withNode,
            });
          } else if (pick === 1) {
            const target = locs[Math.abs(seed) % locs.length] as Loc;
            expectInvertible(ir, { op: "wrap-in-array", path: target.path });
          } else {
            const arrs = findNodes(ir, "array");
            if (arrs.length === 0) return;
            const target = arrs[Math.abs(seed) % arrs.length] as { path: Path };
            expectInvertible(ir, { op: "unwrap-array", path: target.path });
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 add-union-variant / remove-union-variant: roundtrip", () => {
    fc.assert(
      fc.property(
        irArb,
        nodeArb(1).filter(isValid),
        fc.integer(),
        fc.boolean(),
        (ir, variant, seed, add) => {
          const unions = findNodes(ir, "union");
          if (unions.length === 0) return;
          const target = unions[Math.abs(seed) % unions.length] as {
            path: Path;
            node: UnionNode;
          };
          if (add) {
            expectInvertible(ir, {
              op: "add-union-variant",
              path: target.path,
              variant,
            });
          } else {
            // remove requires >= 3 variants (must leave >= 2).
            if (target.node.variants.length < 3) return;
            const idx = Math.abs(seed) % target.node.variants.length;
            expectInvertible(ir, {
              op: "remove-union-variant",
              path: target.path,
              index: idx,
            });
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 set-discriminator: roundtrip", () => {
    fc.assert(
      fc.property(
        irArb,
        fc.option(fieldNameArb, { nil: null }),
        fc.integer(),
        (ir, field, seed) => {
          const unions = findNodes(ir, "union");
          if (unions.length === 0) return;
          const target = unions[Math.abs(seed) % unions.length] as { path: Path };
          expectInvertible(ir, {
            op: "set-discriminator",
            path: target.path,
            field,
          });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 set-additional: roundtrip", () => {
    fc.assert(
      fc.property(
        irArb,
        fc.oneof(
          fc.constant<false | true>(false),
          fc.constant<false | true>(true),
          nodeArb(1).filter(isValid),
        ),
        fc.integer(),
        (ir, value, seed) => {
          const objs = findNodes(ir, "object");
          if (objs.length === 0) return;
          const target = objs[Math.abs(seed) % objs.length] as { path: Path };
          expectInvertible(ir, {
            op: "set-additional",
            path: target.path,
            value: value as false | true | Node,
          });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("C_IV1 batch: roundtrip on simple composition", () => {
    fc.assert(
      fc.property(
        irArb,
        fc.option(fc.constantFrom("email", "uuid"), { nil: null }),
        fc.boolean(),
        fc.integer(),
        (ir, format, optValue, seed) => {
          const objs = findNodes(ir, "object").filter((o) => Object.keys(o.node.fields).length > 0);
          if (objs.length === 0) return;
          const target = objs[Math.abs(seed) % objs.length] as {
            path: Path;
            node: ObjectNode;
          };
          const keys = Object.keys(target.node.fields);
          const name = keys[Math.abs(seed) % keys.length] as string;
          const children: Change[] = [
            { op: "set-optional", path: target.path, name, value: optValue },
            { op: "set-additional", path: target.path, value: true },
          ];
          // Add a set-format inside if the picked field's type is string.
          const entry = target.node.fields[name];
          if (entry && entry.type.kind === "string") {
            children.push({
              op: "set-format",
              path: [...target.path, name],
              format,
            });
          }
          expectInvertible(ir, { op: "batch", changes: children });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
