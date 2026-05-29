// Path helpers. See docs/core-spec.md § "Suggestions and Changes" — Path semantics.
//
// Path segments address nodes by node-kind:
//   - object:  string segment = field name -> fields[name].type
//   - array:   "items" -> items
//   - tuple:   number segment -> items[n]; "rest" -> rest
//   - union:   number segment -> variants[n]
//   - record:  "values" -> values
// An empty path refers to the root node itself.

import type { FieldEntry, IR, Node, Path } from "./types";

export function getNodeAt(ir: IR, path: Path): Node | undefined {
  let current: Node | undefined = ir;
  for (const segment of path) {
    if (current === undefined) return undefined;
    current = step(current, segment);
  }
  return current;
}

export function setNodeAt(ir: IR, path: Path, node: Node): IR {
  if (path.length === 0) return node;
  const head = path[0] as string | number;
  const rest = path.slice(1);
  return replaceAt(ir, head, (child) => setNodeAt(child, rest, node));
}

function step(node: Node, segment: string | number): Node | undefined {
  switch (node.kind) {
    case "object":
      if (typeof segment !== "string") return undefined;
      return node.fields[segment]?.type;
    case "array":
      if (segment === "items") return node.items;
      return undefined;
    case "tuple":
      if (segment === "rest") return node.rest;
      if (typeof segment === "number") return node.items[segment];
      return undefined;
    case "union":
      if (typeof segment === "number") return node.variants[segment];
      return undefined;
    case "record":
      if (segment === "values") return node.values;
      return undefined;
    default:
      return undefined;
  }
}

function replaceAt(node: Node, segment: string | number, recurse: (child: Node) => Node): Node {
  switch (node.kind) {
    case "object": {
      if (typeof segment !== "string") return node;
      const entry = node.fields[segment];
      if (!entry) return node;
      const newFields: Record<string, FieldEntry> = {};
      for (const [name, e] of Object.entries(node.fields)) {
        newFields[name] = name === segment ? { ...e, type: recurse(e.type) } : e;
      }
      return { ...node, fields: newFields };
    }
    case "array":
      if (segment === "items") return { ...node, items: recurse(node.items) };
      return node;
    case "tuple":
      if (segment === "rest" && node.rest !== undefined) {
        return { ...node, rest: recurse(node.rest) };
      }
      if (typeof segment === "number") {
        const existing = node.items[segment];
        if (existing === undefined) return node;
        const newItems = node.items.slice();
        newItems[segment] = recurse(existing);
        return { ...node, items: newItems };
      }
      return node;
    case "union":
      if (typeof segment === "number") {
        const existing = node.variants[segment];
        if (existing === undefined) return node;
        const newVariants = node.variants.slice();
        newVariants[segment] = recurse(existing);
        return { ...node, variants: newVariants };
      }
      return node;
    case "record":
      if (segment === "values") return { ...node, values: recurse(node.values) };
      return node;
    default:
      return node;
  }
}
