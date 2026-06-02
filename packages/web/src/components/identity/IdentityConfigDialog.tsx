// Settings dialog for IdentityConfig. See docs/frontend-spec.md § "Identity-key suggestion".

import { useEffect, useState } from "react";
import { pathKeyToCorePath } from "@/lib/field-stats";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { IdentityPicker } from "./IdentityPicker";

export interface IdentityConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional seed values when opened from the suggestion banner.
  seedFields?: string[];
}

export function IdentityConfigDialog({
  open,
  onOpenChange,
  seedFields,
}: IdentityConfigDialogProps) {
  const current = useStore((s) => s.identityConfig);
  const setIdentityConfig = useStore((s) => s.setIdentityConfig);

  // Selected fields as flat single-segment names. Composite-key support is
  // limited to top-level field combinations (matches core's propose scope).
  const [selected, setSelected] = useState<string[]>([]);
  const [droppedCount, setDroppedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (current) {
      setSelected(current.fields.map((p) => p.join(".")));
    } else if (seedFields?.length) {
      setSelected(seedFields);
    } else {
      setSelected([]);
    }
    setDroppedCount(null);
  }, [open, current, seedFields]);

  function handleSelectedChange(next: string[]): void {
    setSelected(next);
    setDroppedCount(null);
  }

  function handleApply(): void {
    if (selected.length === 0) return;
    // Each entry becomes a Path. Numeric segments (array indices) get
    // converted to numbers so core's navigate() treats them as array steps.
    const fields = selected.map(pathKeyToCorePath);
    const result = setIdentityConfig({ fields });
    setDroppedCount(result.droppedCount);
    if (result.droppedCount === 0) onOpenChange(false);
  }

  function handleClear(): void {
    setIdentityConfig(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Identity-key settings" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Identity key</DialogTitle>
          <DialogDescription>
            Logically dedupe records on a key. Future imports of the same entity collapse instead of
            piling up.
          </DialogDescription>
        </DialogHeader>
        <p className="text-[11px] text-muted-foreground">
          Toggle one field for a simple key, or several for a composite key.
        </p>
        <IdentityPicker selected={selected} onSelectedChange={handleSelectedChange} />
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
          Even without an identity key, schemagen always collapses records that are byte-identical
          (same fields and values, regardless of key order) — re-imports of the same payload won't
          pile up.
        </p>
        {droppedCount !== null && droppedCount > 0 && (
          <p className="rounded-md bg-warning/15 px-2 py-1.5 text-xs text-warning">
            Applying this config would drop {droppedCount} records. Click Apply again to confirm.
          </p>
        )}
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={!current}>
            Remove identity key
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply} disabled={selected.length === 0}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
