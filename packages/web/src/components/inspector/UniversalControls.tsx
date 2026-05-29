import type { Node, Path } from "@schemagen/core";
import { Button } from "../ui/button";

export interface UniversalControlsProps {
  node: Node;
  path: Path;
  applyChange: (change: import("@schemagen/core").Change) => void;
}

export function UniversalControls({ node, path, applyChange }: UniversalControlsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-[--color-border] pb-3">
      <Button
        size="sm"
        variant="outline"
        onClick={() => applyChange({ op: "wrap-in-union", path, with: { kind: "unknown" } })}
      >
        Wrap in union
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => applyChange({ op: "wrap-in-array", path })}
      >
        Wrap in array
      </Button>
      {node.kind === "array" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => applyChange({ op: "unwrap-array", path })}
        >
          Unwrap array
        </Button>
      )}
    </div>
  );
}
