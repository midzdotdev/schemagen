import type { Change, NumberNode, Path } from "@schemagen/core";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export interface NumberControlsProps {
  node: NumberNode;
  path: Path;
  applyChange: (change: Change) => void;
}

export function NumberControls({ node, path, applyChange }: NumberControlsProps) {
  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={node.integer ? "default" : "outline"}
          onClick={() => applyChange({ op: "set-integer", path, value: !node.integer })}
        >
          Integer
        </Button>
      </div>
      <BoundRow label="Min" which="min" value={node.min} path={path} applyChange={applyChange} />
      <BoundRow label="Max" which="max" value={node.max} path={path} applyChange={applyChange} />
    </div>
  );
}

function BoundRow({
  label,
  which,
  value,
  path,
  applyChange,
}: {
  label: string;
  which: "min" | "max";
  value: number | undefined;
  path: Path;
  applyChange: (change: Change) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-xs text-[--color-muted-foreground]">{label}</span>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value === "" ? null : Number(e.target.value);
          if (v === null || !Number.isFinite(v)) {
            applyChange({ op: "set-bound", path, which, value: null });
          } else {
            applyChange({ op: "set-bound", path, which, value: v });
          }
        }}
        aria-label={`${label} bound`}
      />
    </div>
  );
}
