import { type Change, getNodeAt } from "@schemagen/core";
import { useState } from "react";
import { formatPath } from "../../state/selectors";
import { useStore } from "../../state/store";
import { NumberControls } from "./NumberControls";
import { ObjectControls } from "./ObjectControls";
import { StringControls } from "./StringControls";
import { UniversalControls } from "./UniversalControls";

export function Inspector() {
  const ir = useStore((s) => s.ir);
  const selectedPath = useStore((s) => s.selectedPath);
  const apply = useStore((s) => s.applyChange);
  const [error, setError] = useState<string | null>(null);

  if (!ir) {
    return (
      <div className="p-4 text-sm text-[--color-muted-foreground]">
        Import data and select a node to edit its schema.
      </div>
    );
  }
  if (!selectedPath) {
    return (
      <div className="p-4 text-sm text-[--color-muted-foreground]">
        Select a node in the schema tree to inspect it.
      </div>
    );
  }
  const node = getNodeAt(ir, selectedPath);
  if (!node) {
    return <div className="p-4 text-sm text-[--color-muted-foreground]">No node at that path.</div>;
  }

  function applyChange(change: Change): void {
    setError(null);
    try {
      apply(change, { source: "manual" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not apply change");
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <header className="flex flex-col gap-0.5">
        <span className="text-xs uppercase tracking-wide text-[--color-muted-foreground]">
          Inspector
        </span>
        <span className="font-mono text-sm">{formatPath(selectedPath)}</span>
        <span className="text-xs text-[--color-muted-foreground]">{node.kind}</span>
      </header>
      <UniversalControls node={node} path={selectedPath} applyChange={applyChange} />
      {node.kind === "string" && (
        <StringControls node={node} path={selectedPath} applyChange={applyChange} />
      )}
      {node.kind === "number" && (
        <NumberControls node={node} path={selectedPath} applyChange={applyChange} />
      )}
      {node.kind === "object" && (
        <ObjectControls node={node} path={selectedPath} applyChange={applyChange} />
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
