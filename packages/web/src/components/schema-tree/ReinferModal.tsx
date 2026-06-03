// PR FF — re-infer reconciliation modal.
//
// Re-runs inference from the current records, diffs it against the user's IR,
// and walks them through the result: a batch of automatic updates (paths they
// never edited) plus a per-conflict choice for paths they did edit. Nothing is
// applied until "Apply" — Cancel discards the whole staged set.
//
// See docs/plans/pr-ff-reinfer-reconcile.md.

import { type Change, mergeNodes, type Node, type Path } from "@schemagen/core";
import { useEffect, useMemo, useState } from "react";
import { buildReinferDiff } from "@/lib/reinfer";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export interface ReinferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Decision = "keep" | "accept" | "merge";

export function ReinferModal({ open, onOpenChange }: ReinferModalProps) {
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  const inferenceOptions = useStore((s) => s.inferenceOptions);
  const history = useStore((s) => s.history);
  const applyChange = useStore((s) => s.applyChange);

  const diff = useMemo(() => {
    if (!ir || records.length === 0) return null;
    const active = history.entries.slice(0, history.cursor);
    return buildReinferDiff(ir, records, inferenceOptions, active);
  }, [ir, records, inferenceOptions, history]);

  const autoCount = diff?.autoChanges.length ?? 0;
  const conflictCount = diff?.conflictChanges.length ?? 0;

  // Per-conflict reconcile choice. Default "keep" (don't override the user).
  // "merge" is only offered when both sides are unionable (mergeNodes !== null).
  const [applyAuto, setApplyAuto] = useState(true);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  useEffect(() => {
    if (open) {
      setApplyAuto(true);
      setDecisions({});
    }
  }, [open]);

  const decisionOf = (i: number): Decision => decisions[i] ?? "keep";
  function setDecision(i: number, d: Decision): void {
    setDecisions((prev) => ({ ...prev, [i]: d }));
  }

  // The merged node for each conflict, when its two sides can be unioned.
  const mergeable = useMemo(
    () =>
      (diff?.conflictChanges ?? []).map((c) =>
        c.change.op === "set-node" && c.existing ? mergeNodes(c.existing, c.change.node) : null,
      ),
    [diff],
  );

  function handleApply(): void {
    if (diff) {
      if (applyAuto && diff.autoChanges.length > 0) {
        applyChange(
          { op: "batch", changes: diff.autoChanges, label: `Re-infer: ${autoCount} update(s)` },
          { source: "inferred", label: `Re-infer: ${autoCount} automatic update(s)` },
        );
      }
      diff.conflictChanges.forEach((c, i) => {
        const d = decisionOf(i);
        if (d === "accept") {
          applyChange(c.change, { source: "manual" });
        } else if (d === "merge" && c.change.op === "set-node" && mergeable[i]) {
          applyChange(
            { op: "set-node", path: c.change.path, node: mergeable[i] as Node },
            { source: "manual" },
          );
        }
      });
    }
    onOpenChange(false);
  }

  const nothingToDo = autoCount === 0 && conflictCount === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Re-infer schema" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Re-infer schema</DialogTitle>
          <DialogDescription>
            {nothingToDo
              ? "Your schema already matches the current records."
              : `${autoCount} automatic update${autoCount === 1 ? "" : "s"} · ${conflictCount} conflict${
                  conflictCount === 1 ? "" : "s"
                } with your edits`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
          {autoCount > 0 && (
            <section aria-label="Automatic updates" className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={applyAuto}
                  onChange={(e) => setApplyAuto(e.target.checked)}
                  className="size-4 cursor-pointer accent-info"
                />
                Apply {autoCount} automatic update{autoCount === 1 ? "" : "s"}
              </label>
              <ul className="flex flex-col gap-1 rounded-md border border-border bg-card/40 p-2 font-mono text-[11px] text-muted-foreground">
                {diff?.autoChanges.map((c) => (
                  <li key={JSON.stringify(c)}>{describeChange(c)}</li>
                ))}
              </ul>
            </section>
          )}

          {conflictCount > 0 && (
            <section aria-label="Conflicts" className="flex flex-col gap-2">
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                Conflicts with your edits
              </p>
              {diff?.conflictChanges.map((c, i) => {
                const choice = decisionOf(i);
                const merged = mergeable[i];
                return (
                  <div
                    key={JSON.stringify(c.change)}
                    className="flex flex-col gap-2 rounded-md border border-border bg-card/40 px-3 py-2"
                  >
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="text-foreground">{describeChange(c.change)}</span>
                      {c.existing && (
                        <span className="text-muted-foreground">
                          You have it as <code className="font-mono">{nodeLabel(c.existing)}</code>
                        </span>
                      )}
                      {merged && (
                        <span className="text-muted-foreground">
                          Merge keeps both →{" "}
                          <code className="font-mono">{nodeLabel(merged)}</code>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant={choice === "keep" ? "outline" : "ghost"}
                        size="xs"
                        aria-pressed={choice === "keep"}
                        onClick={() => setDecision(i, "keep")}
                      >
                        Keep yours
                      </Button>
                      {merged && (
                        <Button
                          variant={choice === "merge" ? "outline" : "ghost"}
                          size="xs"
                          aria-pressed={choice === "merge"}
                          onClick={() => setDecision(i, "merge")}
                        >
                          Merge both
                        </Button>
                      )}
                      <Button
                        variant={choice === "accept" ? "outline" : "ghost"}
                        size="xs"
                        aria-pressed={choice === "accept"}
                        onClick={() => setDecision(i, "accept")}
                      >
                        Accept new
                      </Button>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={nothingToDo}>
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function pathLabel(path: Path): string {
  return path.length === 0 ? "(root)" : path.map(String).join(".");
}

function nodeLabel(node: Node): string {
  if (node.kind === "string" && node.literals) return `union of ${node.literals.length} values`;
  if (node.kind === "number" && node.literals) return `union of ${node.literals.length} values`;
  if (node.kind === "boolean" && node.literals) return `union of ${node.literals.length} values`;
  if (node.kind === "union") return `union of ${node.variants.length} types`;
  return node.kind;
}

function describeChange(c: Change): string {
  switch (c.op) {
    case "add-field":
      return `Add field "${c.name}"`;
    case "remove-field":
      return `Remove field "${c.name}"`;
    case "set-optional":
      return `Mark "${c.name}" ${c.value ? "optional" : "required"}`;
    case "set-nullable":
      return `Mark "${c.name}" ${c.value ? "nullable" : "non-nullable"}`;
    case "set-node":
      return `Change ${pathLabel(c.path)} to ${nodeLabel(c.node)}`;
    case "set-additional":
      return `${pathLabel(c.path)}: ${c.value === false ? "reject" : "allow"} extra fields`;
    case "batch":
      return `${c.changes.length} change${c.changes.length === 1 ? "" : "s"}`;
    default:
      return `Update ${pathLabel("path" in c ? c.path : [])}`;
  }
}
