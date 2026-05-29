import { emit } from "@schemagen/core";
import { useState } from "react";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const ir = useStore((s) => s.ir);
  const [copied, setCopied] = useState(false);

  const schemaText = ir ? JSON.stringify(emit(ir, "json-schema"), null, 2) : "";

  function handleCopy(): void {
    if (!schemaText) return;
    void navigator.clipboard?.writeText(schemaText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDownload(): void {
    if (!schemaText) return;
    const blob = new Blob([schemaText], { type: "application/schema+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schema.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Export JSON Schema" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>JSON Schema</DialogTitle>
          <DialogDescription>
            Live preview of the schema. Edits to the IR re-render here.
          </DialogDescription>
        </DialogHeader>
        <pre
          aria-label="JSON Schema preview"
          className="max-h-96 overflow-auto rounded border border-[--color-border] bg-[--color-muted] p-3 font-mono text-xs"
        >
          {schemaText || "Import data to see a schema."}
        </pre>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={!schemaText}>
            Download
          </Button>
          <Button size="sm" onClick={handleCopy} disabled={!schemaText}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
