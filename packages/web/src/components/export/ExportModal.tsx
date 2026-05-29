import { emit } from "@schemagen/core";
import { useState } from "react";
import { buildSessionBundle, bundleSizeBytes } from "../../lib/session-bundle";
import { getClientId } from "../../persistence/client-id";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  const history = useStore((s) => s.history);
  const identityConfig = useStore((s) => s.identityConfig);
  const workspaceId = useStore((s) => s.workspaceId);

  const [copied, setCopied] = useState(false);

  const schemaText = ir ? JSON.stringify(emit(ir, "json-schema"), null, 2) : "";

  function handleCopy(): void {
    if (!schemaText) return;
    void navigator.clipboard?.writeText(schemaText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDownloadSchema(): void {
    download(schemaText, "schema.json", "application/schema+json");
  }

  function handleDownloadSession(): void {
    const bundle = buildSessionBundle({
      workspaceName: `Workspace ${workspaceId.slice(0, 8)}`,
      originClientId: getClientId(),
      ir,
      records,
      history: history.entries,
      identityConfig,
    });
    const text = JSON.stringify(bundle, null, 2);
    download(text, "schemagen.session.json", "application/json");
  }

  const sessionSize = ir
    ? bundleSizeBytes(
        buildSessionBundle({
          workspaceName: workspaceId,
          originClientId: getClientId(),
          ir,
          records,
          history: history.entries,
          identityConfig,
        }),
      )
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Export" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Download the schema for downstream tools, or the full session to move workspaces.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="schema">
          <TabsList>
            <TabsTrigger value="schema">Schema only</TabsTrigger>
            <TabsTrigger value="session">Full session</TabsTrigger>
          </TabsList>
          <TabsContent value="schema">
            <pre
              aria-label="JSON Schema preview"
              className="max-h-96 overflow-auto rounded border border-[--color-border] bg-[--color-muted] p-3 font-mono text-xs"
            >
              {schemaText || "Import data to see a schema."}
            </pre>
            <div className="mt-2 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadSchema}
                disabled={!schemaText}
              >
                Download
              </Button>
              <Button size="sm" onClick={handleCopy} disabled={!schemaText}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="session">
            <p className="text-xs text-[--color-muted-foreground]">
              Bundles IR + records + history + identity config into one file. Import it on another
              machine to pick up where you left off. No re-inference, no tweak loss.
            </p>
            <p className="mt-2 text-xs text-[--color-muted-foreground]">
              Estimated size:{" "}
              <span aria-label="Session size" className="font-mono">
                {formatBytes(sessionSize)}
              </span>{" "}
              ({records.length} records, {history.entries.length} history entries)
            </p>
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={handleDownloadSession} disabled={!ir}>
                Download .session.json
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function download(text: string, name: string, mime: string): void {
  if (!text) return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
