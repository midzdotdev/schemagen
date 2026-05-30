import type { Node, Path } from "@schemagen/core";

// Compute the set of pathKeys that should be visible when filtering by `query`.
// A node is visible if its own name matches, OR any descendant matches.
// `expand` carries the paths whose ancestor chains need to be force-expanded
// (so the user actually sees the match).
export interface FilterResult {
  visible: Set<string>;
  expand: Set<string>;
}

export function emptyFilter(): FilterResult {
  return { visible: new Set(), expand: new Set() };
}

export function computeFilter(ir: Node, query: string): FilterResult {
  const result = emptyFilter();
  const q = query.trim().toLowerCase();
  if (!q) return result;

  visit(ir, [], "", q, result);
  return result;
}

const join = (path: Path): string => path.map(String).join(".");

function visit(
  node: Node,
  path: Path,
  name: string,
  query: string,
  out: FilterResult,
): boolean {
  // Match against this node's name. Root has no name and never matches itself.
  const selfMatches = name.toLowerCase().includes(query);

  let anyChild = false;
  for (const child of children(node, path)) {
    const childMatched = visit(child.node, child.path, child.name, query, out);
    if (childMatched) anyChild = true;
  }

  if (selfMatches || anyChild) {
    out.visible.add(join(path));
    // The match itself or its descendants need this node expanded so the
    // user can navigate down to them.
    out.expand.add(join(path));
    return true;
  }
  return false;
}

interface Child {
  node: Node;
  path: Path;
  name: string;
}

function children(node: Node, basePath: Path): Child[] {
  switch (node.kind) {
    case "object":
      return Object.entries(node.fields).map(([name, entry]) => ({
        node: entry.type,
        path: [...basePath, name],
        name,
      }));
    case "array":
      return [{ node: node.items, path: [...basePath, "items"], name: "items" }];
    case "tuple":
      return node.items.map((item, i) => ({
        node: item,
        path: [...basePath, i],
        name: `[${i}]`,
      }));
    case "union":
      return node.variants.map((variant, i) => ({
        node: variant,
        path: [...basePath, i],
        name: `variant ${i}`,
      }));
    case "record":
      return [{ node: node.values, path: [...basePath, "values"], name: "values" }];
    default:
      return [];
  }
}
