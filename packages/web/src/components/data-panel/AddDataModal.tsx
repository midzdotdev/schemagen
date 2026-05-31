// PR EE — Add Data modal. Post-IR, the data pane is gone; this modal
// owns the "import more records into the current workspace" flow.
//
// Flow: paste/upload → Preview (dry-run ingestRecords) shows how many new
// records would land + how many would be discarded as duplicates → Commit
// applies the change; Cancel discards.

import { Loader2, Plus, Upload } from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { shouldRenameWorkspace, workspaceNameFromFile } from "@/lib/filename";
import { ingestAsync } from "@/lib/ingest-async";
import type { IngestResult } from "@/lib/ingest-records";
import { checkRoot, parseImport } from "@/lib/json-import";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";

export interface AddDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Preview {
  result: IngestResult;
  added: number;
  duplicates: number;
}

export function AddDataModal({ open, onOpenChange }: AddDataModalProps) {
  const records = useStore((s) => s.records);
  const ir = useStore((s) => s.ir);
  const identityConfig = useStore((s) => s.identityConfig);
  const identityProposalDismissed = useStore((s) => s.identityProposalDismissed);
  const inferenceOptions = useStore((s) => s.inferenceOptions);
  const setRecords = useStore((s) => s.setRecords);
  const setIdentityProposal = useStore((s) => s.setIdentityProposal);
  const workspaceName = useStore((s) => s.workspaceName);
  const setWorkspaceName = useStore((s) => s.setWorkspaceName);

  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset whenever the modal reopens.
  useEffect(() => {
    if (!open) return;
    setText("");
    setError(null);
    setPreview(null);
    setBusy(false);
  }, [open]);

  async function runPreview(incoming: unknown[]): Promise<void> {
    setBusy(true);
    try {
      const before = records.length;
      const result = await ingestAsync(
        {
          records,
          ir,
          identityConfig,
          identityProposalDismissed,
          inferenceOptions,
        },
        incoming,
      );
      const added = result.records.length - before;
      const duplicates = incoming.length - added;
      setPreview({ result, added, duplicates });
    } finally {
      setBusy(false);
    }
  }

  async function handlePreview(): Promise<void> {
    setError(null);
    const parsed = parseImport(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const root = checkRoot(parsed.value);
    if (!root.ok) {
      setError(root.error);
      return;
    }
    if (!Array.isArray(parsed.value)) {
      // Root-picker isn't surfaced in the modal yet; tell the user to wrap.
      setError("Top-level must be an array of records. Try wrapping in [ … ].");
      return;
    }
    await runPreview(parsed.value);
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    if (shouldRenameWorkspace(workspaceName)) {
      setWorkspaceName(workspaceNameFromFile(file.name));
    }
    void file.text().then(setText);
  }

  function handleCommit(): void {
    if (!preview) return;
    setRecords(preview.result.records);
    if (preview.result.identityProposal !== undefined) {
      setIdentityProposal(preview.result.identityProposal);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Add data" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add data</DialogTitle>
          <DialogDescription>
            Paste or drop more records. schemagen will preview the dedup against the existing
            workspace before you commit.
          </DialogDescription>
        </DialogHeader>

        {preview === null ? (
          <div className="flex flex-col gap-2">
            <Textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'[{ "id": "a", "status": "active" }, ...]'}
              aria-label="Import text"
              className="resize-none text-xs leading-relaxed"
            />
            <div className="flex items-center gap-2">
              <label>
                <input
                  type="file"
                  accept=".json,.ndjson,application/json"
                  onChange={handleFile}
                  className="sr-only"
                  aria-label="Upload data file"
                />
                <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                  <Upload className="size-3.5" />
                  File
                </span>
              </label>
              <Button
                size="sm"
                className="ml-auto"
                onClick={() => void handlePreview()}
                disabled={!text.trim() || busy}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Preview
              </Button>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive"
              >
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
              <p className="font-medium text-foreground">
                {preview.added} new record{preview.added === 1 ? "" : "s"}
                {preview.duplicates > 0 && (
                  <>
                    {" "}
                    <span className="text-muted-foreground">
                      · {preview.duplicates} duplicate
                      {preview.duplicates === 1 ? "" : "s"} of existing
                    </span>
                  </>
                )}
              </p>
              <p className="mt-1 text-muted-foreground">
                Workspace will hold {preview.result.records.length.toLocaleString()} records after
                commit.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {preview !== null && (
            <Button size="sm" onClick={handleCommit} disabled={preview.added === 0}>
              Commit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
