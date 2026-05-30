import type { Change, Node, Path, UnionNode } from "@schemagen/core";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { KindBadge } from "../ui/kind-badge";

export interface UnionControlsProps {
  node: UnionNode;
  path: Path;
  applyChange: (change: Change) => void;
}

const ADDABLE: { kind: Node["kind"]; build: () => Node }[] = [
  { kind: "string", build: () => ({ kind: "string" }) },
  { kind: "number", build: () => ({ kind: "number" }) },
  { kind: "boolean", build: () => ({ kind: "boolean" }) },
  { kind: "null", build: () => ({ kind: "null" }) },
  { kind: "unknown", build: () => ({ kind: "unknown" }) },
];

export function UnionControls({ node, path, applyChange }: UnionControlsProps) {
  const [discDraft, setDiscDraft] = useState(node.discriminator ?? "");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[11px] font-medium text-muted-foreground">
          Variants <span className="ml-1 text-muted-foreground/60">({node.variants.length})</span>
        </h3>
        <ul className="flex flex-col gap-1">
          {node.variants.map((v, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: variants are positional
              key={i}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/50 px-2 py-1 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">[{i}]</span>
                <KindBadge kind={v.kind} />
                <span className="text-muted-foreground">{describe(v)}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                aria-label={`Remove variant ${i}`}
                onClick={() => applyChange({ op: "remove-union-variant", path, index: i })}
                // Core requires unions to keep at least 2 variants; a single
                // variant is just that type and would be modelled differently.
                disabled={node.variants.length <= 2}
                title={
                  node.variants.length <= 2 ? "A union must have at least two variants" : undefined
                }
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-1">
          {ADDABLE.map(({ kind, build }) => (
            <Button
              key={kind}
              size="xs"
              variant="outline"
              onClick={() => applyChange({ op: "add-union-variant", path, variant: build() })}
            >
              <Plus className="size-3" />
              {kind}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[11px] font-medium text-muted-foreground">Discriminator</h3>
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const next = discDraft.trim() || null;
            applyChange({ op: "set-discriminator", path, field: next });
          }}
        >
          <Input
            value={discDraft}
            onChange={(e) => setDiscDraft(e.target.value)}
            placeholder="field name"
            aria-label="Discriminator field"
            className="h-7 text-xs font-mono"
          />
          <Button size="xs" type="submit">
            Set
          </Button>
          {node.discriminator && (
            <Button
              size="xs"
              variant="ghost"
              type="button"
              onClick={() => {
                setDiscDraft("");
                applyChange({ op: "set-discriminator", path, field: null });
              }}
            >
              Clear
            </Button>
          )}
        </form>
        <p className="text-[11px] text-muted-foreground">
          Variants must each contain this field with a unique const value for the discriminator to
          fire on emit.
        </p>
      </div>
    </div>
  );
}

function describe(n: Node): string {
  switch (n.kind) {
    case "object":
      return `object (${Object.keys(n.fields).length} fields)`;
    case "array":
      return "array";
    case "tuple":
      return `tuple (${n.items.length})`;
    case "string":
      if (n.literals)
        return n.literals
          .slice(0, 2)
          .map((s) => JSON.stringify(s))
          .join(" | ");
      return n.format ?? "string";
    case "number":
      return n.integer ? "integer" : "number";
    case "boolean":
      return n.literals ? n.literals.join(" | ") : "boolean";
    case "union":
      return `union (${n.variants.length})`;
    case "record":
      return "record";
    default:
      return n.kind;
  }
}
