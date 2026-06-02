// Records-root picker: a JsonTree decorated with "Use this" buttons on
// candidate paths and a "Selected" badge on whichever candidate is the
// current source of the workspace's records.

import { useMemo } from "react";
import { expandAncestors, JsonTree, jsonTreePathKey } from "@/components/ui/json-tree";
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

export function RootPickerTree({
  parsed,
  candidates,
  onPick,
  selectedPath,
  className,
}: RootPickerTreeProps) {
  const candidateKeys = useMemo(
    () => new Set(candidates.map((c) => jsonTreePathKey(c.path))),
    [candidates],
  );
  const selectedKey = selectedPath ? jsonTreePathKey(selectedPath) : null;
  const initiallyExpanded = useMemo(
    () => expandAncestors(candidates.map((c) => c.path)),
    [candidates],
  );

  return (
    <JsonTree
      value={parsed}
      ariaLabel="JSON tree"
      className={className}
      initiallyExpanded={initiallyExpanded}
      rowClassName={(path, value) => {
        const k = jsonTreePathKey(path);
        if (k === selectedKey) return "bg-emerald-500/15 hover:bg-emerald-500/20";
        if (Array.isArray(value) && candidateKeys.has(k)) return "bg-info/5 hover:bg-info/10";
        return undefined;
      }}
      renderAction={(path) => {
        const k = jsonTreePathKey(path);
        if (k === selectedKey) {
          return (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Selected
            </span>
          );
        }
        if (candidateKeys.has(k)) {
          return (
            <Button
              size="xs"
              variant="default"
              onClick={() => {
                const v = getAtPath(parsed, path) as unknown[];
                onPick(v);
              }}
            >
              Use this
            </Button>
          );
        }
        return null;
      }}
    />
  );
}
