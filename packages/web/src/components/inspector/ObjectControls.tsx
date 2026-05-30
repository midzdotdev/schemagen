import type { Change, ObjectNode, Path } from "@schemagen/core";
import { Plus, X } from "lucide-react";
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
  const fieldCount = Object.keys(node.fields).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[11px] font-medium text-muted-foreground">
          Fields <span className="ml-1 text-muted-foreground/60">({fieldCount})</span>
        </h3>
        <form
          className="flex items-center gap-1.5"
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
            placeholder="add field"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-7 text-xs"
          />
          <Button
            size="xs"
            type="submit"
            aria-label="Add field"
            disabled={!newName.trim() || Boolean(node.fields[newName.trim()])}
          >
            <Plus className="size-3" />
          </Button>
        </form>
        <ul className="flex flex-col gap-1">
          {Object.entries(node.fields).map(([name, entry]) => (
            <li
              key={name}
              className="flex items-center gap-1 rounded-md border border-border bg-card/50 px-1.5 py-1 text-xs"
            >
              <span className="min-w-0 flex-1 truncate font-mono">{name}</span>
              <Button
                size="xs"
                variant={entry.optional ? "default" : "outline"}
                className="h-6 px-1.5 text-[10px]"
                onClick={() =>
                  applyChange({
                    op: "set-optional",
                    path,
                    name,
                    value: !(entry.optional ?? false),
                  })
                }
                title={entry.optional ? "Optional" : "Required"}
              >
                opt
              </Button>
              <Button
                size="xs"
                variant={entry.nullable ? "default" : "outline"}
                className="h-6 px-1.5 text-[10px]"
                onClick={() =>
                  applyChange({
                    op: "set-nullable",
                    path,
                    name,
                    value: !(entry.nullable ?? false),
                  })
                }
                title={entry.nullable ? "Nullable" : "Not nullable"}
              >
                null
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                aria-label={`Remove ${name}`}
                onClick={() => applyChange({ op: "remove-field", path, name })}
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[11px] font-medium text-muted-foreground">Additional properties</h3>
        <div className="flex gap-1">
          <Button
            size="xs"
            variant={node.additional === false ? "default" : "outline"}
            onClick={() => applyChange({ op: "set-additional", path, value: false })}
            className="flex-1"
          >
            Closed
          </Button>
          <Button
            size="xs"
            variant={node.additional === true ? "default" : "outline"}
            onClick={() => applyChange({ op: "set-additional", path, value: true })}
            className="flex-1"
          >
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}
