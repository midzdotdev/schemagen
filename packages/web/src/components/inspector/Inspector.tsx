import { type Change, getNodeAt } from "@schemagen/core";
import { MousePointer2, Wand2 } from "lucide-react";
import { useState } from "react";
import { formatPath } from "../../state/selectors";
import { useStore } from "../../state/store";
import { EmptyState } from "../shell/EmptyState";
import { KindBadge } from "../ui/kind-badge";
import { ArrayControls } from "./ArrayControls";
import { ExamplesButton } from "./ExamplesButton";
import { NumberControls } from "./NumberControls";
import { ObjectControls } from "./ObjectControls";
import { RecordControls } from "./RecordControls";
import { StringControls } from "./StringControls";
import { TupleControls } from "./TupleControls";
import { UnionControls } from "./UnionControls";
import { UniversalControls } from "./UniversalControls";

export function Inspector() {
  const ir = useStore((s) => s.ir);
  const selectedPath = useStore((s) => s.selectedPath);
  const apply = useStore((s) => s.applyChange);
  const [error, setError] = useState<string | null>(null);

  if (!ir) {
    return (
      <EmptyState
        icon={<Wand2 className="size-5" />}
        title="Nothing to inspect"
        description="Once data is imported, the schema tree will appear in the center pane. Select a node to edit it here."
      />
    );
  }
  if (!selectedPath) {
    return (
      <EmptyState
        icon={<MousePointer2 className="size-5" />}
        title="Select a node"
        description="Click any field, type, or container in the schema tree to inspect and edit it."
      />
    );
  }
  const node = getNodeAt(ir, selectedPath);
  if (!node) {
    return <EmptyState title="No node at that path." />;
  }

  function applyChange(change: Change): void {
    setError(null);
    try {
      apply(change, { source: "manual" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not apply change");
    }
  }

  const pathLabel = selectedPath.length === 0 ? "(root)" : formatPath(selectedPath);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1.5 border-b border-border bg-background px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Path
          </span>
          <KindBadge kind={node.kind} />
        </div>
        <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
          {pathLabel}
        </code>
        <div className="flex justify-end pt-1">
          <ExamplesButton />
        </div>
      </div>
      <div className="flex flex-col">
        <Section title="Common">
          <UniversalControls node={node} path={selectedPath} applyChange={applyChange} />
        </Section>
        {node.kind === "string" && (
          <Section title="String">
            <StringControls node={node} path={selectedPath} applyChange={applyChange} />
          </Section>
        )}
        {node.kind === "number" && (
          <Section title="Number">
            <NumberControls node={node} path={selectedPath} applyChange={applyChange} />
          </Section>
        )}
        {node.kind === "object" && (
          <Section title="Object">
            <ObjectControls node={node} path={selectedPath} applyChange={applyChange} />
          </Section>
        )}
        {node.kind === "array" && (
          <Section title="Array">
            <ArrayControls node={node} path={selectedPath} applyChange={applyChange} />
          </Section>
        )}
        {node.kind === "tuple" && (
          <Section title="Tuple">
            <TupleControls node={node} path={selectedPath} applyChange={applyChange} />
          </Section>
        )}
        {node.kind === "union" && (
          <Section title="Union">
            <UnionControls node={node} path={selectedPath} applyChange={applyChange} />
          </Section>
        )}
        {node.kind === "record" && (
          <Section title="Record">
            <RecordControls node={node} path={selectedPath} applyChange={applyChange} />
          </Section>
        )}
        {error && (
          <div className="px-3 py-2">
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive"
            >
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="px-3 pt-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}
