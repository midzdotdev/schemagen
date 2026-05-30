import type { Change, FieldEntry, Node, ObjectNode, Path } from "@schemagen/core";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { KindBadge } from "../ui/kind-badge";

export interface ObjectControlsProps {
  node: ObjectNode;
  path: Path;
  applyChange: (change: Change) => void;
}

// Kinds you can switch a field to without losing data — the discriminated-union
// constructors that don't need ancillary configuration. (set-node would let
// you go further, but these cover the everyday flips.)
const SWITCHABLE_KINDS: { kind: Node["kind"]; build: () => Node }[] = [
  { kind: "string", build: () => ({ kind: "string" }) },
  { kind: "number", build: () => ({ kind: "number" }) },
  { kind: "boolean", build: () => ({ kind: "boolean" }) },
  { kind: "null", build: () => ({ kind: "null" }) },
  { kind: "unknown", build: () => ({ kind: "unknown" }) },
];

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

interface FieldRowProps {
  name: string;
  entry: FieldEntry;
  index: number;
  total: number;
  existingNames: string[];
  onMove: (direction: -1 | 1) => void;
  onRename: (to: string) => void;
  onSetOptional: (value: boolean) => void;
  onSetNullable: (value: boolean) => void;
  onSetType: (type: Node) => void;
  onRemove: () => void;
}

function FieldRow({
  name,
  entry,
  index,
  total,
  existingNames,
  onMove,
  onRename,
  onSetOptional,
  onSetNullable,
  onSetType,
  onRemove,
}: FieldRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  function commitRename(): void {
    setRenaming(false);
    const next = draft.trim();
    if (!next || next === name) {
      setDraft(name);
      return;
    }
    if (existingNames.includes(next)) {
      setDraft(name);
      return;
    }
    onRename(next);
  }

  return (
    <li className="rounded-md border border-border bg-card/50 px-1.5 py-1 text-xs">
      <div className="flex items-center gap-1">
        <div className="flex flex-col">
          <button
            type="button"
            aria-label={`Move ${name} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="rounded p-0 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowUp className="size-2.5" />
          </button>
          <button
            type="button"
            aria-label={`Move ${name} down`}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="rounded p-0 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowDown className="size-2.5" />
          </button>
        </div>
        {renaming ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              commitRename();
            }}
          >
            <input
              ref={renameInputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraft(name);
                  setRenaming(false);
                }
              }}
              aria-label={`Rename field ${name}`}
              className="h-6 min-w-0 flex-1 rounded border border-input bg-background px-1.5 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              size="icon"
              type="submit"
              variant="ghost"
              className="size-5"
              aria-label="Save rename"
            >
              <Check className="size-3" />
            </Button>
          </form>
        ) : (
          <button
            type="button"
            title="Click to rename"
            onClick={() => {
              setDraft(name);
              setRenaming(true);
            }}
            className="group/name flex min-w-0 flex-1 items-center gap-1 truncate text-left font-mono hover:text-foreground"
          >
            <span className="truncate">{name}</span>
            <Pencil className="size-2.5 shrink-0 text-muted-foreground opacity-0 group-hover/name:opacity-100" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowTypeMenu((v) => !v)}
          aria-label={`Change type of ${name}`}
          aria-expanded={showTypeMenu}
          className="rounded hover:bg-muted"
        >
          <KindBadge kind={entry.type.kind} />
        </button>
        <Button
          size="xs"
          variant={entry.optional ? "default" : "outline"}
          className="h-6 px-1.5 text-[10px]"
          onClick={() => onSetOptional(!(entry.optional ?? false))}
          title={entry.optional ? "Optional" : "Required"}
        >
          opt
        </Button>
        <Button
          size="xs"
          variant={entry.nullable ? "default" : "outline"}
          className="h-6 px-1.5 text-[10px]"
          onClick={() => onSetNullable(!(entry.nullable ?? false))}
          title={entry.nullable ? "Nullable" : "Not nullable"}
        >
          null
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
        >
          <X className="size-3" />
        </Button>
      </div>
      {showTypeMenu && (
        <div className="mt-1.5 flex flex-wrap gap-1 rounded-md bg-muted/40 p-1.5">
          {SWITCHABLE_KINDS.map(({ kind, build }) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                onSetType(build());
                setShowTypeMenu(false);
              }}
              className={cn(
                "rounded px-1 py-0.5 hover:bg-background",
                entry.type.kind === kind && "ring-1 ring-ring",
              )}
              aria-label={`Set type to ${kind}`}
            >
              <KindBadge kind={kind} />
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
