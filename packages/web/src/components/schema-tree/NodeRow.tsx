import type { EvidenceTree, FieldEntry, Node, Path } from "@schemagen/core";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import { evidenceAtPath, pathsEqual } from "../../state/selectors";
import { useStore } from "../../state/store";
import { Badge } from "../ui/badge";

export interface NodeRowProps {
  node: Node;
  path: Path;
  name?: string;
  fieldEntry?: FieldEntry;
  evidence: EvidenceTree | null;
  mismatchCount: number;
  depth: number;
  defaultExpanded?: boolean;
}

export function NodeRow({
  node,
  path,
  name,
  fieldEntry,
  evidence,
  mismatchCount,
  depth,
  defaultExpanded,
}: NodeRowProps) {
  const selectedPath = useStore((s) => s.selectedPath);
  const setSelectedPath = useStore((s) => s.setSelectedPath);
  // X6: default-collapse below depth 3 — root + 2 levels visible by default.
  const initialExpanded = defaultExpanded ?? depth < 3;
  const [expanded, setExpanded] = useState(initialExpanded);

  const isSelected = pathsEqual(path, selectedPath);
  const children = childRows(node, path);
  const hasChildren = children.length > 0;

  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? expanded : undefined}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 rounded px-1.5 py-0.5 text-sm hover:bg-[--color-muted] cursor-pointer",
          isSelected && "bg-[--color-muted]",
        )}
        style={{ paddingLeft: `${depth * 0.75 + 0.375}rem` }}
        onClick={() => setSelectedPath(path)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedPath(path);
          }
        }}
        // biome-ignore lint/a11y/useSemanticElements: row is a tree-item; using div for layout
        role="button"
        tabIndex={0}
      >
        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          className={cn("flex h-4 w-4 items-center justify-center", !hasChildren && "invisible")}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {name && <span className="font-medium">{name}</span>}
        <span className="text-[--color-muted-foreground]">{describe(node)}</span>
        {fieldEntry?.optional && (
          <Badge variant="outline" className="text-[10px]">
            optional
          </Badge>
        )}
        {fieldEntry?.nullable && (
          <Badge variant="outline" className="text-[10px]">
            nullable
          </Badge>
        )}
        {mismatchCount > 0 && (
          <Badge
            variant="destructive"
            className="text-[10px]"
            aria-label={`${mismatchCount} mismatches`}
          >
            {mismatchCount}
          </Badge>
        )}
        <EvidenceSummary node={node} evidence={evidence} />
      </div>
      {expanded && hasChildren && (
        // biome-ignore lint/a11y/useSemanticElements: <fieldset> would force a default border; this is a virtualizable tree row container
        <div role="group">
          {children.map((child) => {
            const childEvidence = evidenceAtPath(evidence, child.path.slice(path.length));
            return (
              <NodeRow
                key={child.key}
                node={child.node}
                path={child.path}
                evidence={childEvidence}
                mismatchCount={child.mismatchCount}
                depth={depth + 1}
                {...(child.name !== undefined ? { name: child.name } : {})}
                {...(child.fieldEntry !== undefined ? { fieldEntry: child.fieldEntry } : {})}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ChildRow {
  key: string;
  node: Node;
  path: Path;
  name?: string;
  fieldEntry?: FieldEntry;
  mismatchCount: number;
}

function childRows(node: Node, basePath: Path): ChildRow[] {
  switch (node.kind) {
    case "object":
      return Object.entries(node.fields).map(([name, entry]) => ({
        key: `field:${name}`,
        node: entry.type,
        path: [...basePath, name],
        name,
        fieldEntry: entry,
        mismatchCount: 0,
      }));
    case "array":
      return [
        {
          key: "items",
          node: node.items,
          path: [...basePath, "items"],
          name: "items",
          mismatchCount: 0,
        },
      ];
    case "tuple":
      return node.items.map((item, i) => ({
        key: `pos:${i}`,
        node: item,
        path: [...basePath, i],
        name: `[${i}]`,
        mismatchCount: 0,
      }));
    case "union":
      return node.variants.map((variant, i) => ({
        key: `variant:${i}`,
        node: variant,
        path: [...basePath, i],
        name: `variant ${i}`,
        mismatchCount: 0,
      }));
    case "record":
      return [
        {
          key: "values",
          node: node.values,
          path: [...basePath, "values"],
          name: "values",
          mismatchCount: 0,
        },
      ];
    default:
      return [];
  }
}

function describe(node: Node): string {
  switch (node.kind) {
    case "unknown":
      return "unknown";
    case "null":
      return "null";
    case "boolean":
      return node.literals ? `boolean = ${node.literals.join(" | ")}` : "boolean";
    case "number":
      return node.integer ? "integer" : "number";
    case "string":
      if (node.literals) return `"${node.literals.join('" | "')}"`;
      if (node.format) return `string (${node.format})`;
      return "string";
    case "array":
      return "array";
    case "tuple":
      return `tuple (${node.items.length})`;
    case "object":
      return `object (${Object.keys(node.fields).length} fields)`;
    case "record":
      return "record";
    case "union":
      return `union (${node.variants.length})`;
  }
}

function EvidenceSummary({ node, evidence }: { node: Node; evidence: EvidenceTree | null }) {
  if (!evidence) return null;
  if (evidence.kind !== node.kind) return null;
  const text = describeEvidence(evidence);
  if (!text) return null;
  return (
    <span className="ml-auto truncate text-[10px] text-[--color-muted-foreground]">{text}</span>
  );
}

function describeEvidence(e: EvidenceTree): string {
  switch (e.kind) {
    case "string": {
      const top = Object.entries(e.values)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([v, c]) => `${JSON.stringify(v)}×${c}`)
        .join(", ");
      return top ? `${e.count} • ${top}` : `${e.count}`;
    }
    case "number":
      return `${e.count} • ${e.min ?? "?"}…${e.max ?? "?"}`;
    case "boolean":
      return `${e.count} • t:${e.trueCount} f:${e.falseCount}`;
    case "object":
      return `${e.count} records`;
    case "array":
      return e.count > 0 ? `${e.count} • len ${e.lengths.min}..${e.lengths.max}` : "";
    case "union":
      return `${e.count} • variants ${e.variantCounts.join(",")}`;
    default:
      return `${e.count}`;
  }
}
