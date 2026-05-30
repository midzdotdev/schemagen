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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Integer constraint</span>
        <Button
          size="xs"
          variant={node.integer ? "default" : "outline"}
          onClick={() => applyChange({ op: "set-integer", path, value: !node.integer })}
        >
          {node.integer ? "Required" : "Off"}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <BoundRow label="Min" which="min" value={node.min} path={path} applyChange={applyChange} />
        <BoundRow label="Max" which="max" value={node.max} path={path} applyChange={applyChange} />
      </div>
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
  const id = `bound-${which}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        type="number"
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
        aria-label={`${label} bound`}
      />
    </div>
  );
}
