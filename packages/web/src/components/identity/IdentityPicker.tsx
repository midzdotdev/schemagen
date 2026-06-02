// Identity-key picker — flat-rendered tree of record fields (top-level +
// nested + array-element). Each visible row indents via padding-left based
// on its depth, so the type / uniqueness / presence columns stay aligned
// in one grid.
//
// Selection is stored as dot-joined strings (e.g. "user.id" or "tags.0.name");
// the dialog converts numeric segments to numbers before writing the Path
// to the store.

import { ChevronRight } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  compositeUniqueness,
  computeFieldTree,
  type FieldTreeNode,
  isPrimitiveKind,
} from "@/lib/field-stats";
import { TYPE_BG, TYPE_TEXT } from "@/lib/type-colors";
import { useStore } from "@/state/store";

export interface IdentityPickerProps {
  selected: string[];
  onSelectedChange: (next: string[]) => void;
}

export function IdentityPicker({ selected, onSelectedChange }: IdentityPickerProps) {
  const records = useStore((s) => s.records);

  const tree = useMemo(() => computeFieldTree(records), [records]);
  const composite = useMemo(
    () => (selected.length > 0 ? compositeUniqueness(records, selected) : 0),
    [records, selected],
  );

  // Auto-expand containers whose subtree has a primitive leaf so candidates
  // surface without drilling in.
  const [expanded, setExpanded] = useState<Set<string>>(() => initialExpanded(tree));

  function toggleExpanded(pathKey: string): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) next.delete(pathKey);
      else next.add(pathKey);
      return next;
    });
  }

  function toggleSelected(pathKey: string): void {
    onSelectedChange(
      selected.includes(pathKey) ? selected.filter((p) => p !== pathKey) : [...selected, pathKey],
    );
  }

  const noRecords = records.length === 0;
  const noFields = !noRecords && tree.length === 0;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visibleRows = useMemo(() => flatten(tree, 0, expanded), [tree, expanded]);

  if (noRecords) {
    return (
      <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Import some records first — schemagen needs a sample to compute uniqueness per field.
      </p>
    );
  }
  if (noFields) {
    return (
      <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        No fields available.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {selected.length > 1 && (
        <span className="self-end text-[11px] text-muted-foreground">
          Composite uniqueness:{" "}
          <span className={cn("font-medium", composite >= 0.95 ? "text-success" : "text-warning")}>
            {(composite * 100).toFixed(0)}%
          </span>
        </span>
      )}
      <ul
        aria-label="Available identity fields"
        className="flex flex-col gap-0.5 rounded-md border border-border bg-card/40 p-1 font-mono text-xs"
      >
        {visibleRows.map(({ node, depth }) => (
          <FieldRow
            key={node.pathKey}
            node={node}
            depth={depth}
            isSelected={selectedSet.has(node.pathKey)}
            isOpen={expanded.has(node.pathKey)}
            onToggleSelected={toggleSelected}
            onToggleExpanded={toggleExpanded}
          />
        ))}
      </ul>
    </div>
  );
}

interface FieldRowProps {
  node: FieldTreeNode;
  depth: number;
  isSelected: boolean;
  isOpen: boolean;
  onToggleSelected: (pathKey: string) => void;
  onToggleExpanded: (pathKey: string) => void;
}

// Indent step per level — tuned so deeply-nested rows stay readable.
const INDENT_PX = 14;

function FieldRow({
  node,
  depth,
  isSelected,
  isOpen,
  onToggleSelected,
  onToggleExpanded,
}: FieldRowProps) {
  const selectable = isPrimitiveKind(node.kind);
  const hasChildren = node.children.length > 0;
  const isUnique = node.uniqueness >= 0.95;
  const isPresent = node.presence >= 0.95;
  const inputId = useId();

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded px-1 py-1 transition-colors hover:bg-accent/40",
          isSelected && "bg-info/10 hover:bg-info/15",
        )}
        style={{ paddingLeft: 4 + depth * INDENT_PX }}
      >
        {/* Single leading control slot — chevron OR checkbox OR spacer.
            Containers (objects/arrays) and primitives never coexist on the
            same row, so one column is enough. */}
        <span className="flex size-3.5 shrink-0 items-center justify-center">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleExpanded(node.pathKey)}
              aria-label={isOpen ? "Collapse" : "Expand"}
              className="flex size-3.5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className={cn("size-3 transition-transform", isOpen && "rotate-90")} />
            </button>
          ) : selectable ? (
            <input
              id={inputId}
              type="checkbox"
              aria-label={node.pathKey}
              checked={isSelected}
              onChange={() => onToggleSelected(node.pathKey)}
              className="size-3.5 cursor-pointer accent-info"
            />
          ) : null}
        </span>
        {selectable ? (
          <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer truncate">
            <code className="text-foreground">{node.segment}</code>
          </label>
        ) : (
          <code className="min-w-0 flex-1 truncate text-muted-foreground">{node.segment}</code>
        )}
        <span
          title="Field type"
          className={cn(
            "inline-block w-16 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-medium uppercase tracking-wide",
            TYPE_BG[node.kind],
            TYPE_TEXT[node.kind],
          )}
        >
          {node.kind}
        </span>
        <span
          title="Uniqueness"
          className={cn(
            "inline-block w-24 shrink-0 text-right tabular-nums",
            selectable ? (isUnique ? "text-success" : "text-muted-foreground") : "text-transparent",
          )}
        >
          {selectable ? `${(node.uniqueness * 100).toFixed(0)}% unique` : "—"}
        </span>
        <span
          title="Presence"
          className={cn(
            "inline-block w-24 shrink-0 text-right tabular-nums",
            isPresent ? "text-foreground" : "text-warning",
          )}
        >
          {(node.presence * 100).toFixed(0)}% present
        </span>
      </div>
    </li>
  );
}

interface FlatRow {
  node: FieldTreeNode;
  depth: number;
}

function flatten(nodes: FieldTreeNode[], depth: number, expanded: Set<string>): FlatRow[] {
  const out: FlatRow[] = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children.length > 0 && expanded.has(n.pathKey)) {
      out.push(...flatten(n.children, depth + 1, expanded));
    }
  }
  return out;
}

// Auto-expand any container whose subtree has at least one primitive leaf
// so the user sees candidates without drilling in.
function initialExpanded(tree: FieldTreeNode[]): Set<string> {
  const out = new Set<string>();
  function visit(nodes: FieldTreeNode[]): boolean {
    let hasLeaf = false;
    for (const n of nodes) {
      if (isPrimitiveKind(n.kind)) {
        hasLeaf = true;
        continue;
      }
      const childHasLeaf = visit(n.children);
      if (childHasLeaf) {
        out.add(n.pathKey);
        hasLeaf = true;
      }
    }
    return hasLeaf;
  }
  visit(tree);
  return out;
}
