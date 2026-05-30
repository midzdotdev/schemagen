import type { EvidenceTree, FieldEntry, Node, Path } from "@schemagen/core";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import { evidenceAtPath, pathsEqual } from "../../state/selectors";
import { useStore } from "../../state/store";
import { Badge } from "../ui/badge";
import { KindBadge } from "../ui/kind-badge";

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
  const indent = depth * 14;

  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? expanded : undefined}
    >
      <div
        className={cn(
          "group/row relative flex items-center gap-2 py-1 pr-3 text-sm transition-colors",
          "hover:bg-accent/40",
          isSelected && "bg-accent text-accent-foreground",
        )}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={() => setSelectedPath(path)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedPath(path);
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Indent guides — make depth feel intentional, not arbitrary. */}
        {depth > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 flex"
            style={{ width: `${indent + 8}px` }}
          >
            {Array.from({ length: depth }).map((_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: positional guide rails
                key={i}
                className="w-[14px] border-r border-border/50"
              />
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          className={cn(
            "z-10 flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground",
            !hasChildren && "invisible",
          )}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>

        {name !== undefined && (
          <span
            className={cn(
              "z-10 truncate font-mono text-[13px]",
              isSelected ? "text-accent-foreground" : "text-foreground",
            )}
          >
            {name}
          </span>
        )}

        <KindBadge kind={node.kind}>{kindLabel(node)}</KindBadge>

        {detailText(node) && (
          <span
            className={cn(
              "z-10 truncate font-mono text-[11px]",
              isSelected ? "text-accent-foreground/80" : "text-muted-foreground",
            )}
          >
            {detailText(node)}
          </span>
        )}

        <div className="z-10 ml-auto flex shrink-0 items-center gap-1.5">
          {fieldEntry?.optional && (
            <Badge variant="muted" className="normal-case">
              optional
            </Badge>
          )}
          {fieldEntry?.nullable && (
            <Badge variant="muted" className="normal-case">
              nullable
            </Badge>
          )}
          {mismatchCount > 0 && (
            <Badge
              variant="destructive"
              className="normal-case"
              aria-label={`${mismatchCount} mismatches`}
            >
              {mismatchCount}
            </Badge>
          )}
          <EvidenceSummary node={node} evidence={evidence} isSelected={isSelected} />
        </div>
      </div>
      {expanded && hasChildren && (
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

function kindLabel(node: Node): string {
  if (node.kind === "number" && node.integer) return "integer";
  if (node.kind === "string" && node.format) return node.format;
  return node.kind;
}

function detailText(node: Node): string | null {
  switch (node.kind) {
    case "boolean":
      return node.literals ? `= ${node.literals.join(" | ")}` : null;
    case "string":
      if (node.literals) {
        const shown = node.literals.slice(0, 3).map((s) => JSON.stringify(s));
        const more = node.literals.length > 3 ? ` +${node.literals.length - 3}` : "";
        return shown.join(" | ") + more;
      }
      return null;
    case "tuple":
      return `${node.items.length} items`;
    case "object":
      return `${Object.keys(node.fields).length} fields`;
    case "union":
      return `${node.variants.length} variants`;
    default:
      return null;
  }
}

function EvidenceSummary({
  node,
  evidence,
  isSelected,
}: {
  node: Node;
  evidence: EvidenceTree | null;
  isSelected: boolean;
}) {
  if (!evidence) return null;
  if (evidence.kind !== node.kind) return null;
  const text = describeEvidence(evidence);
  if (!text) return null;
  return (
    <span
      className={cn(
        "max-w-[16rem] truncate font-mono text-[10px]",
        isSelected ? "text-accent-foreground/70" : "text-muted-foreground",
      )}
    >
      {text}
    </span>
  );
}

function describeEvidence(e: EvidenceTree): string {
  switch (e.kind) {
    case "string": {
      const top = Object.entries(e.values)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([v, c]) => `${truncate(v, 20)}×${c}`)
        .join(", ");
      return top ? `${e.count} · ${top}` : `${e.count}`;
    }
    case "number":
      return `${e.count} · ${e.min ?? "?"}…${e.max ?? "?"}`;
    case "boolean":
      return `${e.count} · t:${e.trueCount} f:${e.falseCount}`;
    case "object":
      return `${e.count}`;
    case "array":
      return e.count > 0 ? `${e.count} · len ${e.lengths.min}..${e.lengths.max}` : `${e.count}`;
    case "union":
      return `${e.count} · variants ${e.variantCounts.join(",")}`;
    default:
      return `${e.count}`;
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
