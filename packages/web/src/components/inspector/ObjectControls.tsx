import type { Change, ObjectNode, Path } from "@schemagen/core";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export interface ObjectControlsProps {
  node: ObjectNode;
  path: Path;
  applyChange: (change: Change) => void;
}

export function ObjectControls({ node, path, applyChange }: ObjectControlsProps) {
  const [newName, setNewName] = useState("");

  return (
    <div className="flex flex-col gap-3 pt-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = newName.trim();
          if (!name || node.fields[name]) return;
          applyChange({
            op: "add-field",
            path,
            name,
            entry: { type: { kind: "unknown" }, optional: true },
          });
          setNewName("");
        }}
      >
        <Input
          aria-label="New field name"
          placeholder="field name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button
          size="sm"
          type="submit"
          disabled={!newName.trim() || Boolean(node.fields[newName.trim()])}
        >
          Add field
        </Button>
      </form>
      <ul className="flex flex-col gap-1">
        {Object.entries(node.fields).map(([name, entry]) => (
          <li
            key={name}
            className="flex items-center gap-1 rounded border border-[--color-border] px-2 py-1 text-xs"
          >
            <span className="flex-1 font-mono">{name}</span>
            <Button
              size="sm"
              variant={entry.optional ? "default" : "outline"}
              onClick={() =>
                applyChange({
                  op: "set-optional",
                  path,
                  name,
                  value: !(entry.optional ?? false),
                })
              }
            >
              opt
            </Button>
            <Button
              size="sm"
              variant={entry.nullable ? "default" : "outline"}
              onClick={() =>
                applyChange({
                  op: "set-nullable",
                  path,
                  name,
                  value: !(entry.nullable ?? false),
                })
              }
            >
              null
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove ${name}`}
              onClick={() => applyChange({ op: "remove-field", path, name })}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[--color-muted-foreground]">Additional</span>
        <Button
          size="sm"
          variant={node.additional === false ? "default" : "outline"}
          onClick={() => applyChange({ op: "set-additional", path, value: false })}
        >
          Closed
        </Button>
        <Button
          size="sm"
          variant={node.additional === true ? "default" : "outline"}
          onClick={() => applyChange({ op: "set-additional", path, value: true })}
        >
          Open
        </Button>
      </div>
    </div>
  );
}
