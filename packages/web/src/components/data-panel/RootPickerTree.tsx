// JSON tree picker — body extracted from RootPickerModal so the new-workspace
// wizard can render it inline inside Step 1.
//
// Candidates (arrays-of-objects per enumerateCandidates) get a "Use this"
// button; everything else is browsable but not selectable. Ancestors of a
// candidate auto-expand on first render so the picks surface without the
// user having to drill in. The currently-selected path (if any) is highlighted.

import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { getAtPath, type PickerCandidate, type PickerPath } from "@/lib/root-picker";
import { Button } from "../ui/button";

export interface RootPickerTreeProps {
  parsed: unknown;
  candidates: PickerCandidate[];
  onPick: (records: unknown[]) => void;
  // Highlight the currently-selected path so the user knows which array
  // they're already viewing. Optional — modal flows don't need it.
  selectedPath?: PickerPath | undefined;
  className?: string;
}

function pathKey(path: PickerPath): string {
  return path.map(String).join("/");
}

// Pre-expand the root + every ancestor of a candidate so the user sees the
// pickable arrays without having to drill in.
function initialExpanded(candidates: PickerCandidate[]): Set<string> {
  const out = new Set<string>([pathKey([])]);
  for (const c of candidates) {
    for (let i = 0; i < c.path.length; i++) {
      out.add(pathKey(c.path.slice(0, i)));
    }
  }
  return out;
}

export function RootPickerTree({
  parsed,
  candidates,
  onPick,
  selectedPath,
  className,
}: RootPickerTreeProps) {
  const candidateKeys = useMemo(
    () => new Set(candidates.map((c) => pathKey(c.path))),
    [candidates],
  );
  const selectedKey = selectedPath ? pathKey(selectedPath) : null;
  const [expanded, setExpanded] = useState<Set<string>>(() => initialExpanded(candidates));

  function toggle(path: PickerPath): void {
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
      aria-label="JSON tree"
      className={cn(
        "max-h-[60vh] overflow-y-auto rounded-md border border-border bg-card/40 p-2 font-mono text-xs",
        className,
      )}
    >
      <TreeNode
        value={parsed}
        path={[]}
        label="(root)"
        candidateKeys={candidateKeys}
        selectedKey={selectedKey}
        expanded={expanded}
        onToggle={toggle}
        onPick={(p) => {
          const v = getAtPath(parsed, p) as unknown[];
          onPick(v);
        }}
      />
    </ul>
  );
}

interface TreeNodeProps {
  value: unknown;
  path: PickerPath;
  label: string;
  candidateKeys: Set<string>;
  selectedKey: string | null;
  expanded: Set<string>;
  onToggle: (path: PickerPath) => void;
  onPick: (path: PickerPath) => void;
}

function TreeNode({
  value,
  path,
  label,
  candidateKeys,
  selectedKey,
  expanded,
  onToggle,
  onPick,
}: TreeNodeProps) {
  const isObject = isRecord(value);
  const isArray = Array.isArray(value);
  const isContainer = isObject || isArray;
  const key = pathKey(path);
  const isCandidate = isArray && candidateKeys.has(key);
  const isSelected = key === selectedKey;
  const isOpen = expanded.has(key);

  const typeLabel = describe(value);

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-accent/40",
          isCandidate && !isSelected && "bg-info/5 hover:bg-info/10",
          isSelected && "bg-emerald-500/15 hover:bg-emerald-500/20",
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
        {isCandidate && !isSelected && (
          <Button size="xs" variant="default" className="ml-auto" onClick={() => onPick(path)}>
            Use this
          </Button>
        )}
        {isSelected && (
          <span className="ml-auto rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Selected
          </span>
        )}
      </div>
      {isContainer && isOpen && (
        <ul className="ml-3 border-l border-border/60 pl-2">
          {childrenOf(value).map(([childLabel, childValue, childSegment]) => (
            <TreeNode
              key={pathKey([...path, childSegment])}
              value={childValue}
              path={[...path, childSegment]}
              label={childLabel}
              candidateKeys={candidateKeys}
              selectedKey={selectedKey}
              expanded={expanded}
              onToggle={onToggle}
              onPick={onPick}
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
