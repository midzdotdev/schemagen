import type { Change, ObjectNode, Path } from "@schemagen/core";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { FieldRow } from "./FieldRow";

export interface ObjectControlsProps {
  node: ObjectNode;
  path: Path;
  applyChange: (change: Change) => void;
}

export function ObjectControls({ node, path, applyChange }: ObjectControlsProps) {
  const [newName, setNewName] = useState("");
  const fieldNames = Object.keys(node.fields);
  const fieldCount = fieldNames.length;

  function move(from: number, to: number): void {
    if (to < 0 || to >= fieldNames.length) return;
    const order = [...fieldNames];
    const [moved] = order.splice(from, 1);
    if (!moved) return;
    order.splice(to, 0, moved);
    applyChange({ op: "reorder-fields", path, order });
  }

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
          {fieldNames.map((name, idx) => {
            const entry = node.fields[name];
            if (!entry) return null;
            return (
              <FieldRow
                key={name}
                name={name}
                entry={entry}
                index={idx}
                total={fieldCount}
                existingNames={fieldNames}
                onMove={(direction) => move(idx, idx + direction)}
                onRename={(to) => applyChange({ op: "rename-field", path, from: name, to })}
                onSetOptional={(value) => applyChange({ op: "set-optional", path, name, value })}
                onSetNullable={(value) => applyChange({ op: "set-nullable", path, name, value })}
                onSetType={(type) =>
                  applyChange({ op: "set-field-type", path: [...path, name], type })
                }
                onRemove={() => applyChange({ op: "remove-field", path, name })}
              />
            );
          })}
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
