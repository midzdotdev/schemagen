// Settings dialog for IdentityConfig. See docs/frontend-spec.md § "Identity-key suggestion".

import type { IdentityConfig } from "@schemagen/core";
import { useEffect, useState } from "react";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";

export interface IdentityConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional seed values when opened from the suggestion banner.
  seedFields?: string[];
}

const MODES: { value: IdentityConfig["onDuplicate"]; label: string; description: string }[] = [
  {
    value: "replace",
    label: "Replace",
    description:
      "Newest wins. Best for snapshot-style imports where you want the current entity set.",
  },
  {
    value: "skip",
    label: "Skip",
    description: "First occurrence wins. Useful when you want to lock in the original version.",
  },
  {
    value: "keep-all",
    label: "Keep all",
    description:
      "No logical dedup. Useful when entities mutate and the schema should see every version.",
  },
];

export function IdentityConfigDialog({
  open,
  onOpenChange,
  seedFields,
}: IdentityConfigDialogProps) {
  const current = useStore((s) => s.identityConfig);
  const setIdentityConfig = useStore((s) => s.setIdentityConfig);

  const [fieldText, setFieldText] = useState("");
  const [mode, setMode] = useState<IdentityConfig["onDuplicate"]>("replace");
  const [droppedCount, setDroppedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (current) {
      setFieldText(current.fields.map((p) => p.join(".")).join(", "));
      setMode(current.onDuplicate);
    } else if (seedFields?.length) {
      setFieldText(seedFields.join(", "));
      setMode("replace");
    } else {
      setFieldText("");
      setMode("replace");
    }
    setDroppedCount(null);
  }, [open, current, seedFields]);

  function handleApply(): void {
    const fields = fieldText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => p.split(".").filter(Boolean));
    if (fields.length === 0) return;
    const result = setIdentityConfig({ fields, onDuplicate: mode });
    setDroppedCount(result.droppedCount);
    if (result.droppedCount === 0) onOpenChange(false);
  }

  function handleClear(): void {
    setIdentityConfig(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Identity-key settings">
        <DialogHeader>
          <DialogTitle>Identity key</DialogTitle>
          <DialogDescription>
            Logically dedupe records on a key. Future imports of the same entity collapse instead of
            piling up.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="identity-fields" className="text-xs font-medium text-foreground">
              Fields
            </label>
            <Input
              id="identity-fields"
              placeholder="id, or order.id, lineId"
              value={fieldText}
              onChange={(e) => setFieldText(e.target.value)}
              aria-label="Identity fields"
            />
            <p className="text-[11px] text-muted-foreground">
              Comma-separated. Use dot notation for nested fields.
            </p>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-foreground">On duplicate</legend>
            {MODES.map((m) => (
              <label
                key={m.value}
                className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs transition-colors ${
                  mode === m.value
                    ? "border-ring/40 bg-accent/60"
                    : "border-border hover:border-border/80 hover:bg-accent/30"
                }`}
              >
                <input
                  type="radio"
                  name="onDuplicate"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{m.label}</span>
                  <span className="ml-1.5 text-muted-foreground">{m.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {droppedCount !== null && droppedCount > 0 && (
            <p className="rounded-md bg-warning/15 px-2 py-1.5 text-xs text-warning">
              Applying this config would drop {droppedCount} records. Click Apply again to confirm.
            </p>
          )}
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={!current}>
            Clear identity
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply} disabled={!fieldText.trim()}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
