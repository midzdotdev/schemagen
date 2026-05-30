import type { ArrayNode, Change, Path } from "@schemagen/core";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { KindBadge } from "../ui/kind-badge";

export interface ArrayControlsProps {
  node: ArrayNode;
  path: Path;
  applyChange: (change: Change) => void;
}

export function ArrayControls({ node, path, applyChange }: ArrayControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <Subsection title="Items">
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/50 px-2 py-1.5 text-xs">
          <span className="text-muted-foreground">Element type</span>
          <KindBadge kind={node.items.kind} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Select <code className="font-mono">items</code> in the schema tree to edit the element
          type.
        </p>
      </Subsection>
      <Subsection title="Length">
        <div className="grid grid-cols-2 gap-2">
          <BoundField
            label="Min items"
            which="minItems"
            value={node.minItems}
            path={path}
            applyChange={applyChange}
          />
          <BoundField
            label="Max items"
            which="maxItems"
            value={node.maxItems}
            path={path}
            applyChange={applyChange}
          />
        </div>
      </Subsection>
      <Subsection title="Uniqueness">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">Items must be unique</span>
          <Button
            size="xs"
            variant={node.uniqueItems ? "default" : "outline"}
            onClick={() => {
              // Core has no dedicated op for uniqueItems; use set-node with a
              // shallow-cloned array node carrying the toggled flag.
              const next: ArrayNode = node.uniqueItems
                ? omitUniqueItems(node)
                : { ...node, uniqueItems: true };
              applyChange({ op: "set-node", path, node: next });
            }}
          >
            {node.uniqueItems ? "Required" : "Off"}
          </Button>
        </div>
      </Subsection>
      <Subsection title="Structure">
        <Button
          size="xs"
          variant="outline"
          onClick={() => applyChange({ op: "unwrap-array", path })}
        >
          Unwrap (use element type as the schema)
        </Button>
      </Subsection>
    </div>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-[11px] font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

// Helper: clear the uniqueItems flag without mutating the original node.
// exactOptionalPropertyTypes makes `uniqueItems: undefined` a type error.
function omitUniqueItems(node: ArrayNode): ArrayNode {
  const { uniqueItems: _omit, ...rest } = node;
  return rest;
}

function BoundField({
  label,
  which,
  value,
  path,
  applyChange,
}: {
  label: string;
  which: "minItems" | "maxItems";
  value: number | undefined;
  path: Path;
  applyChange: (change: Change) => void;
}) {
  const id = `array-${which}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={0}
        value={value ?? ""}
        placeholder="unset"
        className="h-7 text-xs"
        onChange={(e) => {
          const v = e.target.value === "" ? null : Number(e.target.value);
          if (v === null || !Number.isFinite(v)) {
            applyChange({ op: "set-bound", path, which, value: null });
          } else {
            applyChange({ op: "set-bound", path, which, value: v });
          }
        }}
        aria-label={`${which} bound`}
      />
    </div>
  );
}
