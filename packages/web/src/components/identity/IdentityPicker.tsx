// Identity-key picker — tree of record fields (top-level + nested), with
// per-leaf stats and an "Identity key" badge on selected paths.
//
// Selection is stored as dot-joined strings (e.g. "user.id") to match the
// shape `setIdentityConfig` expects after splitting on dots.

import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  compositeUniqueness,
  computeFieldTree,
  type FieldTreeNode,
  isPrimitiveKind,
} from "@/lib/field-stats";
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

  // Auto-expand the root + every ancestor of a primitive leaf at first
  // render so the user sees candidates without drilling in. New paths
  // discovered after first render aren't auto-expanded.
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-foreground">Fields</span>
          {selected.length > 1 && (
            <span className="text-[11px] text-muted-foreground">
              Composite uniqueness:{" "}
              <span
                className={cn("font-medium", composite >= 0.95 ? "text-success" : "text-warning")}
              >
                {(composite * 100).toFixed(0)}%
              </span>
            </span>
          )}
        </div>
        {noRecords ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Import some records first — schemagen needs a sample to compute uniqueness per field.
          </p>
        ) : noFields ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            No fields available.
          </p>
        ) : (
          <ul
            aria-label="Available identity fields"
            className="flex max-h-64 flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-card/40 p-1.5 font-mono text-xs"
          >
            {tree.map((node) => (
              <FieldRow
                key={node.pathKey}
                node={node}
                selectedSet={selectedSet}
                expanded={expanded}
                onToggleSelected={toggleSelected}
                onToggleExpanded={toggleExpanded}
              />
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">
          Toggle one field for a simple key, or several for a composite key (uniqueness of the tuple
          is shown above). Duplicates on the identity key keep the newest version.
        </p>
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
          Either way, schemagen always collapses records that are byte-identical (same fields and
          values, regardless of key order) — re-imports of the same payload won't pile up.
        </p>
      </div>
    </div>
  );
}

interface FieldRowProps {
  node: FieldTreeNode;
  selectedSet: Set<string>;
  expanded: Set<string>;
  onToggleSelected: (pathKey: string) => void;
  onToggleExpanded: (pathKey: string) => void;
}

function FieldRow({
  node,
  selectedSet,
  expanded,
  onToggleSelected,
  onToggleExpanded,
}: FieldRowProps) {
  const selectable = isPrimitiveKind(node.kind);
  const isSelected = selectedSet.has(node.pathKey);
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.pathKey);
  const isUnique = node.uniqueness >= 0.95;
  const isPresent = node.presence >= 0.95;

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded px-1.5 py-1 transition-colors hover:bg-accent/40",
          isSelected && "bg-info/10 hover:bg-info/15",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpanded(node.pathKey)}
            aria-label={isOpen ? "Collapse" : "Expand"}
            className="flex size-3.5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className={cn("size-3 transition-transform", isOpen && "rotate-90")} />
          </button>
        ) : (
          <span className="size-3.5 shrink-0" aria-hidden />
        )}
        {selectable ? (
          <label aria-label={node.pathKey} className="flex min-w-0 flex-1 items-center gap-1.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelected(node.pathKey)}
              className="size-3.5 shrink-0 cursor-pointer accent-info"
            />
            <code className="min-w-0 flex-1 truncate text-foreground">{node.segment}</code>
          </label>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            {/* Spacer to align with the checkbox column on primitive rows */}
            <span className="size-3.5 shrink-0" aria-hidden />
            <code className="min-w-0 flex-1 truncate text-muted-foreground">{node.segment}</code>
          </span>
        )}
        <span
          title="Field type"
          className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
        >
          {node.kind}
        </span>
        {selectable && (
          <>
            <span
              title="Uniqueness"
              className={cn(
                "shrink-0 tabular-nums",
                isUnique ? "text-success" : "text-muted-foreground",
              )}
            >
              {(node.uniqueness * 100).toFixed(0)}% unique
            </span>
            <span
              title="Presence"
              className={cn(
                "shrink-0 tabular-nums",
                isPresent ? "text-foreground" : "text-warning",
              )}
            >
              {(node.presence * 100).toFixed(0)}% present
            </span>
          </>
        )}
        {isSelected && (
          <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Identity key
          </span>
        )}
      </div>
      {isOpen && hasChildren && (
        <ul className="ml-3 border-l border-border/60 pl-1">
          {node.children.map((child) => (
            <FieldRow
              key={child.pathKey}
              node={child}
              selectedSet={selectedSet}
              expanded={expanded}
              onToggleSelected={onToggleSelected}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </ul>
      )}
    </li>
  );
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
