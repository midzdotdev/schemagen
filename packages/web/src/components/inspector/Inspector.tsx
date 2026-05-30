import {
  type ArrayNode,
  type Change,
  getNodeAt,
  type Node,
  type NumberNode,
  type ObjectNode,
  type Path,
  type RecordNode,
  type StringNode,
  type TupleNode,
  type UnionNode,
} from "@schemagen/core";
import { MousePointer2, Wand2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { formatPath } from "@/state/selectors";
import { useStore } from "@/state/store";
import { EmptyState } from "../shell/EmptyState";
import { KindBadge } from "../ui/kind-badge";
import { ArrayControls } from "./ArrayControls";
import { ExamplesButton } from "./ExamplesButton";
import { NumberControls } from "./NumberControls";
import { ObjectControls } from "./ObjectControls";
import { RecordControls } from "./RecordControls";
import { InspectorSection } from "./Section";
import { StringControls } from "./StringControls";
import { TupleControls } from "./TupleControls";
import { UnionControls } from "./UnionControls";
import { UniversalControls } from "./UniversalControls";

// Per-kind controls. A kind without a row here means the universal controls
// alone apply (unknown / null / boolean today). Adding a new kind to the IR
// makes this a TypeScript error via NarrowedControl below, surfacing the gap.
type ControlComponent<N extends Node> = (props: {
  node: N;
  path: Path;
  applyChange: (change: Change) => void;
}) => ReactNode;

interface KindControl<K extends Node["kind"], N extends Extract<Node, { kind: K }>> {
  title: string;
  Component: ControlComponent<N>;
}

const CONTROLS = {
  string: { title: "String", Component: StringControls } satisfies KindControl<
    "string",
    StringNode
  >,
  number: { title: "Number", Component: NumberControls } satisfies KindControl<
    "number",
    NumberNode
  >,
  object: { title: "Object", Component: ObjectControls } satisfies KindControl<
    "object",
    ObjectNode
  >,
  array: { title: "Array", Component: ArrayControls } satisfies KindControl<"array", ArrayNode>,
  tuple: { title: "Tuple", Component: TupleControls } satisfies KindControl<"tuple", TupleNode>,
  union: { title: "Union", Component: UnionControls } satisfies KindControl<"union", UnionNode>,
  record: { title: "Record", Component: RecordControls } satisfies KindControl<
    "record",
    RecordNode
  >,
} as const;

type KindWithControls = keyof typeof CONTROLS;
function hasControls(kind: Node["kind"]): kind is KindWithControls {
  return kind in CONTROLS;
}

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
        <InspectorSection title="Common">
          <UniversalControls node={node} path={selectedPath} applyChange={applyChange} />
        </InspectorSection>
        <KindSection node={node} path={selectedPath} applyChange={applyChange} />
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

// Renders the kind-specific section for `node`, or nothing if the kind has no
// specific controls (unknown / null / boolean). The `as` assertions are safe
// because we narrowed on node.kind right above each call site — but TypeScript
// can't prove that across the indexed lookup.
function KindSection({
  node,
  path,
  applyChange,
}: {
  node: Node;
  path: Path;
  applyChange: (change: Change) => void;
}): ReactNode {
  if (!hasControls(node.kind)) return null;
  const { title, Component } = CONTROLS[node.kind];
  // The cast bridges the indexed-lookup boundary; verified by KindControl<K,N>
  // pairings in the CONTROLS table.
  const Specific = Component as ControlComponent<Node>;
  return (
    <InspectorSection title={title}>
      <Specific node={node} path={path} applyChange={applyChange} />
    </InspectorSection>
  );
}
