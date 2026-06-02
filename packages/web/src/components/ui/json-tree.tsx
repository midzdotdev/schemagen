// Generic expandable JSON tree. Pure structural view — chevron on every
// container, type/count label per row, syntax-coloured primitive previews.
//
// Extension hooks for callers that want decorations per node:
//   - rowClassName(path, value): add classes to specific rows (e.g. a tinted
//     background on a "candidate" path or the currently-selected one).
//   - renderAction(path, value): trailing-edge node per row (e.g. a "Use this"
//     button on candidate rows, a "Selected" badge on the active row).
//
// Expand state is internal to the component. `initiallyExpanded` seeds the
// open paths on first mount (default: just the root).

import { ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";

export type JsonPath = (string | number)[];

export interface JsonTreeProps {
  value: unknown;
  initiallyExpanded?: JsonPath[] | undefined;
  renderAction?: ((path: JsonPath, value: unknown) => ReactNode) | undefined;
  rowClassName?: ((path: JsonPath, value: unknown) => string | undefined) | undefined;
  ariaLabel?: string | undefined;
  className?: string | undefined;
}

function pathKey(path: JsonPath): string {
  return path.map(String).join("/");
}

export function JsonTree({
  value,
  initiallyExpanded,
  renderAction,
  rowClassName,
  ariaLabel = "JSON tree",
  className,
}: JsonTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const out = new Set<string>([pathKey([])]);
    if (initiallyExpanded) for (const p of initiallyExpanded) out.add(pathKey(p));
    return out;
  });

  function toggle(path: JsonPath): void {
    const k = pathKey(path);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  return (
    <ul
      aria-label={ariaLabel}
      className={cn("rounded-md border border-border bg-card/40 p-2 font-mono text-xs", className)}
    >
      <TreeNode
        value={value}
        path={[]}
        label="(root)"
        expanded={expanded}
        onToggle={toggle}
        renderAction={renderAction}
        rowClassName={rowClassName}
      />
    </ul>
  );
}

interface TreeNodeProps {
  value: unknown;
  path: JsonPath;
  label: string;
  expanded: Set<string>;
  onToggle: (path: JsonPath) => void;
  renderAction?: ((path: JsonPath, value: unknown) => ReactNode) | undefined;
  rowClassName?: ((path: JsonPath, value: unknown) => string | undefined) | undefined;
}

function TreeNode({
  value,
  path,
  label,
  expanded,
  onToggle,
  renderAction,
  rowClassName,
}: TreeNodeProps) {
  const isObject = isRecord(value);
  const isArray = Array.isArray(value);
  const isContainer = isObject || isArray;
  const isOpen = expanded.has(pathKey(path));
  const action = renderAction?.(path, value);
  const extraClass = rowClassName?.(path, value);
  const typeLabel = describe(value);

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-accent/40",
          extraClass,
        )}
      >
        {isContainer ? (
          <button
            type="button"
            onClick={() => onToggle(path)}
            aria-label={isOpen ? "Collapse" : "Expand"}
            className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className={cn("size-3 transition-transform", isOpen && "rotate-90")} />
          </button>
        ) : (
          <span className="size-4 shrink-0" aria-hidden />
        )}
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">{typeLabel}</span>
        {!isContainer && (
          <span className="ml-1 min-w-0 flex-1 truncate text-emerald-600 dark:text-emerald-400">
            {previewPrimitive(value)}
          </span>
        )}
        {action && <span className="ml-auto shrink-0">{action}</span>}
      </div>
      {isContainer && isOpen && (
        <ul className="ml-3 border-l border-border/60 pl-2">
          {childrenOf(value).map(([childLabel, childValue, childSegment]) => (
            <TreeNode
              key={pathKey([...path, childSegment])}
              value={childValue}
              path={[...path, childSegment]}
              label={childLabel}
              expanded={expanded}
              onToggle={onToggle}
              renderAction={renderAction}
              rowClassName={rowClassName}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function childrenOf(value: unknown): [label: string, value: unknown, segment: string | number][] {
  if (Array.isArray(value)) {
    return value.map((v, i) => [`[${i}]`, v, i] as [string, unknown, number]);
  }
  if (isRecord(value)) {
    return Object.entries(value).map(([k, v]) => [k, v, k] as [string, unknown, string]);
  }
  return [];
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[ empty array ]";
    const elemKind = uniformKind(value);
    if (elemKind === "object") {
      return `[ ${value.length.toLocaleString()} object${value.length === 1 ? "" : "s"} ]`;
    }
    if (elemKind !== null) {
      return `[ ${value.length.toLocaleString()} ${elemKind}${value.length === 1 ? "" : "s"} ]`;
    }
    return `[ ${value.length.toLocaleString()} mixed items ]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    return `{ ${keys.length} field${keys.length === 1 ? "" : "s"} }`;
  }
  return typeof value;
}

function uniformKind(arr: unknown[]): string | null {
  const kinds = new Set<string>();
  for (const v of arr) {
    if (v === null) kinds.add("null");
    else if (Array.isArray(v)) kinds.add("array");
    else if (typeof v === "object") kinds.add("object");
    else kinds.add(typeof v);
    if (kinds.size > 1) return null;
  }
  return kinds.values().next().value ?? null;
}

function previewPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") {
    const s = value.length > 60 ? `${value.slice(0, 60)}…` : value;
    return JSON.stringify(s);
  }
  return String(value);
}

// Expose for callers that want to build their own path keys (e.g. for
// indexing into a Set of "selected" paths when computing rowClassName).
export function jsonTreePathKey(path: JsonPath): string {
  return pathKey(path);
}

// Convenience: pre-expand the root + every ancestor of every supplied path.
// Useful when callers want to surface candidates without making the user drill.
export function expandAncestors(paths: JsonPath[]): JsonPath[] {
  const out: JsonPath[] = [[]];
  for (const p of paths) {
    for (let i = 0; i < p.length; i++) {
      out.push(p.slice(0, i));
    }
  }
  return out;
}
