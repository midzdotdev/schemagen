// Welcome view for a brand-new (empty) workspace. Replaces the cold-start
// three-pane layout when there are no records and no IR: a single roomy
// landing page with the three on-ramps the user actually has at this point
// — pick a sample, bring your own data, or restore a previous workspace
// bundle.
//
// Reuses the same ingest plumbing as DataPanel (ingestAsync + RootPickerModal),
// so any flow that lands records here is identical to landing them in the
// cold-start panel.

import {
  ChevronRight,
  ClipboardPaste,
  FileJson,
  FileUp,
  Inbox,
  Newspaper,
  Rocket,
  Sparkles,
  Upload,
} from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { shouldRenameWorkspace, workspaceNameFromFile } from "@/lib/filename";
import { ingestText } from "@/lib/import-pipeline";
import { ingestAsync } from "@/lib/ingest-async";
import { getAtPath, type PickerCandidate } from "@/lib/root-picker";
import { parseWorkspaceBundle } from "@/lib/workspace-bundle";
import { loadWorkspaceBundle } from "@/state/init";
import { useStore } from "@/state/store";
import { DropZone } from "../data-panel/DropZone";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

interface Sample {
  id: string;
  name: string;
  blurb: string;
  detail: string;
  icon: React.ReactNode;
  filename: string;
}

const SAMPLES: Sample[] = [
  {
    id: "hn",
    name: "HackerNews top stories",
    blurb: "20 stories",
    detail: "Small and simple — a quick first look at how schemagen reads JSON.",
    icon: <Newspaper className="size-5" />,
    filename: "hackernews-top.json",
  },
  {
    id: "swapi",
    name: "Star Wars characters",
    blurb: "20 people from SWAPI",
    detail: "Watch low-cardinality fields like gender become a literal union.",
    icon: <Rocket className="size-5" />,
    filename: "swapi-people.json",
  },
  {
    id: "openlibrary",
    name: "Open Library — Tolkien",
    blurb: "20 nested works",
    detail: "Deeply nested objects to navigate, with arrays inside arrays.",
    icon: <Sparkles className="size-5" />,
    filename: "openlibrary-tolkien.json",
  },
];

export function WelcomeView() {
  const records = useStore((s) => s.records);
  const setRecords = useStore((s) => s.setRecords);
  const setIR = useStore((s) => s.setIR);
  const ir = useStore((s) => s.ir);
  const identityConfig = useStore((s) => s.identityConfig);
  const dismissed = useStore((s) => s.identityProposalDismissed);
  const setIdentityProposal = useStore((s) => s.setIdentityProposal);
  const inferenceOptions = useStore((s) => s.inferenceOptions);
  const workspaceName = useStore((s) => s.workspaceName);
  const setWorkspaceName = useStore((s) => s.setWorkspaceName);
  const setPendingImport = useStore((s) => s.setPendingImport);

  const [pasteText, setPasteText] = useState("");
  // Errors are split by on-ramp so each renders next to the control that
  // produced it; file/bundle errors live inside the "More ways to start"
  // disclosure and force it open.
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busySample, setBusySample] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);

  async function commitRecords(newRecords: unknown[]): Promise<void> {
    if (ingesting) return;
    setIngesting(true);
    try {
      const result = await ingestAsync(
        {
          records,
          ir,
          identityConfig,
          identityProposalDismissed: dismissed,
          inferenceOptions,
        },
        newRecords,
      );
      setRecords(result.records);
      if (!ir && result.ir) setIR(result.ir);
      if (result.identityProposal !== undefined) setIdentityProposal(result.identityProposal);
    } finally {
      setIngesting(false);
    }
  }

  // Auto-pick the first enumerated candidate. The user can re-pick in the
  // wizard's Step 1 — the tree picker is shown there inline. No modal at
  // import time keeps the welcome → wizard transition snappy.
  function handleNeedsPicker(parsed: unknown, candidates: PickerCandidate[]): void {
    const first = candidates[0];
    if (!first) return;
    const records = getAtPath(parsed, first.path) as unknown[];
    void commitRecords(records);
  }

  const onRecords = (rs: unknown[]): void => {
    void commitRecords(rs);
  };

  async function handleSample(sample: Sample): Promise<void> {
    setBusySample(sample.id);
    setSampleError(null);
    try {
      const r = await fetch(`/samples/${sample.filename}`);
      if (!r.ok) throw new Error(`fetch failed (${r.status})`);
      const text = await r.text();
      if (shouldRenameWorkspace(workspaceName)) {
        setWorkspaceName(workspaceNameFromFile(sample.filename));
      }
      const result = ingestText(text, onRecords, handleNeedsPicker);
      if (!result.ok) throw new Error(result.error ?? "could not import");
      if (result.parsed !== undefined && result.candidates) {
        setPendingImport({ parsed: result.parsed, candidates: result.candidates });
      }
    } catch (e) {
      setSampleError(e instanceof Error ? e.message : "failed to load sample");
    } finally {
      setBusySample(null);
    }
  }

  function handlePaste(): void {
    setPasteError(null);
    const result = ingestText(pasteText, onRecords, handleNeedsPicker);
    if (!result.ok) {
      setPasteError(result.error ?? "could not import");
      return;
    }
    if (result.parsed !== undefined && result.candidates) {
      setPendingImport({ parsed: result.parsed, candidates: result.candidates });
    }
    setPasteText("");
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    if (shouldRenameWorkspace(workspaceName)) {
      setWorkspaceName(workspaceNameFromFile(file.name));
    }
    void file.text().then((text) => {
      const result = ingestText(text, onRecords, handleNeedsPicker);
      if (!result.ok) {
        setFileError(result.error ?? "could not import");
        setMoreOpen(true);
        return;
      }
      if (result.parsed !== undefined && result.candidates) {
        setPendingImport({ parsed: result.parsed, candidates: result.candidates });
      }
    });
  }

  function handleBundleImport(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    setBundleError(null);
    void file.text().then(async (raw) => {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch (err) {
        setBundleError(err instanceof Error ? err.message : "could not parse bundle file");
        setMoreOpen(true);
        return;
      }
      const result = parseWorkspaceBundle(value);
      if (!result.ok) {
        setBundleError(result.error);
        setMoreOpen(true);
        return;
      }
      try {
        await loadWorkspaceBundle(result.bundle);
      } catch (err) {
        setBundleError(err instanceof Error ? err.message : "could not import bundle");
        setMoreOpen(true);
      }
    });
  }

  return (
    <DropZone onRecords={onRecords} onNeedsPicker={handleNeedsPicker} disabled={ingesting}>
      <div className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
          {/* Hero */}
          <header className="flex flex-col gap-2">
            <h1 className="font-semibold text-2xl text-foreground tracking-tight">
              Welcome to your workspace
            </h1>
            <p className="text-muted-foreground text-sm">
              Schemagen infers a JSON schema from a sample of your data, then lets you refine it by
              hand. Start by giving it some records.
            </p>
            {/* Global drag hint — applies to the whole page (the DropZone), so it
                lives outside any single on-ramp. */}
            <p className="text-[11px] text-muted-foreground">
              Tip: drag a <code className="font-mono">.json</code> or{" "}
              <code className="font-mono">.ndjson</code> file anywhere on this page to import it.
            </p>
          </header>

          {/* Primary on-ramp: paste */}
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
              <ClipboardPaste className="size-3.5" />
              Paste your JSON
            </h2>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3">
              <Textarea
                rows={8}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='Paste an array of objects, e.g. [{ "id": "a", "status": "active" }, …]'
                aria-label="Paste JSON"
                className="resize-none text-xs leading-relaxed"
              />
              <Button
                size="sm"
                onClick={handlePaste}
                disabled={!pasteText.trim() || ingesting}
                className="self-start"
              >
                <FileJson className="size-3.5" />
                Import
              </Button>
            </div>
            {pasteError && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-2 py-1.5 text-destructive text-xs"
              >
                {pasteError}
              </p>
            )}
          </section>

          {/* Secondary on-ramp: sample datasets */}
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
              Or try a sample dataset
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SAMPLES.map((sample) => (
                <li key={sample.id}>
                  <button
                    type="button"
                    disabled={busySample !== null || ingesting}
                    onClick={() => void handleSample(sample)}
                    className="group flex h-full w-full flex-col gap-2 rounded-lg border border-border bg-card/40 p-3 text-left transition-colors hover:border-ring/50 hover:bg-accent/40 disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground">
                      {sample.icon}
                      <span className="font-mono text-[10px] uppercase tracking-wider">
                        {busySample === sample.id ? "Loading…" : sample.blurb}
                      </span>
                    </span>
                    <span className="font-medium text-foreground text-sm">{sample.name}</span>
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      {sample.detail}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {sampleError && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-2 py-1.5 text-destructive text-xs"
              >
                {sampleError}
              </p>
            )}
          </section>

          {/* Fallback on-ramps: file upload + bundle restore, tucked away. */}
          <details
            open={moreOpen}
            onToggle={(e) => setMoreOpen(e.currentTarget.open)}
            className="flex flex-col gap-3"
          >
            <summary className="w-fit cursor-pointer font-semibold text-[11px] text-muted-foreground uppercase tracking-wider hover:text-foreground">
              More ways to start
            </summary>

            <div className="mt-3 flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card/40 p-3 transition-colors hover:border-ring/50 hover:bg-accent/40">
                <Upload className="size-5 text-muted-foreground" aria-hidden />
                <span className="flex-1 text-sm">
                  <span className="block font-medium text-foreground">Upload a data file</span>
                  <span className="block text-[11px] text-muted-foreground">
                    A <code className="font-mono">.json</code> or{" "}
                    <code className="font-mono">.ndjson</code> file of records.
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                <input
                  type="file"
                  accept=".json,.ndjson,application/json"
                  onChange={handleFile}
                  className="sr-only"
                  aria-label="Upload data file"
                  disabled={ingesting}
                />
              </label>
              {fileError && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/10 px-2 py-1.5 text-destructive text-xs"
                >
                  {fileError}
                </p>
              )}

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card/40 p-3 transition-colors hover:border-ring/50 hover:bg-accent/40">
                <FileUp className="size-5 text-muted-foreground" aria-hidden />
                <span className="flex-1 text-sm">
                  <span className="block font-medium text-foreground">
                    Import a workspace bundle
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    A <code className="font-mono">.workspace.json</code> exported from schemagen —
                    restores records, schema edits, history, and identity config.
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                <input
                  type="file"
                  accept=".json,.workspace.json,.session.json,application/json"
                  onChange={handleBundleImport}
                  className="sr-only"
                  aria-label="Import workspace bundle file"
                  disabled={ingesting}
                />
              </label>
              {bundleError && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/10 px-2 py-1.5 text-destructive text-xs"
                >
                  {bundleError}
                </p>
              )}

              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Inbox className="size-3.5" />
                Or pick a previous workspace from the switcher in the top-left.
              </p>
            </div>
          </details>
        </div>
      </div>
    </DropZone>
  );
}
