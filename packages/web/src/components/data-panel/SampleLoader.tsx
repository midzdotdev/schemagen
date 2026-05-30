import { Newspaper, Rocket, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { shouldRenameWorkspace, workspaceNameFromFile } from "@/lib/filename";
import { ingestText } from "@/lib/import-pipeline";
import type { PickerCandidate } from "@/lib/root-picker";
import { useStore } from "@/state/store";

interface Sample {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  filename: string; // basename — used both as the public/samples/<name>.json key and for workspace naming
}

const SAMPLES: Sample[] = [
  {
    id: "hn",
    name: "HackerNews top stories",
    description: "20 stories. Small + simple — quick first look.",
    icon: <Newspaper className="size-4" />,
    filename: "hackernews-top.json",
  },
  {
    id: "swapi",
    name: "Star Wars characters",
    description: "20 people from SWAPI. Watch gender turn into a literal union.",
    icon: <Rocket className="size-4" />,
    filename: "swapi-people.json",
  },
  {
    id: "openlibrary",
    name: "Open Library — Tolkien",
    description: "20 works. Deep nested objects to navigate.",
    icon: <Sparkles className="size-4" />,
    filename: "openlibrary-tolkien.json",
  },
];

export interface SampleLoaderProps {
  onRecords: (records: unknown[]) => void;
  onNeedsPicker: (parsed: unknown, candidates: PickerCandidate[]) => void;
}

export function SampleLoader({ onRecords, onNeedsPicker }: SampleLoaderProps) {
  const workspaceName = useStore((s) => s.workspaceName);
  const setWorkspaceName = useStore((s) => s.setWorkspaceName);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(sample: Sample): Promise<void> {
    setBusy(sample.id);
    setError(null);
    try {
      const r = await fetch(`/samples/${sample.filename}`);
      if (!r.ok) throw new Error(`fetch failed (${r.status})`);
      const text = await r.text();
      if (shouldRenameWorkspace(workspaceName)) {
        setWorkspaceName(workspaceNameFromFile(sample.filename));
      }
      const result = ingestText(text, onRecords, onNeedsPicker);
      if (!result.ok) throw new Error(result.error ?? "could not import");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load sample");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Or try a sample
      </p>
      <ul className="flex flex-col gap-1.5">
        {SAMPLES.map((sample) => (
          <li key={sample.id}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void pick(sample)}
              className="flex w-full items-start gap-2 rounded-md border border-border bg-card/40 px-2.5 py-2 text-left text-xs transition-colors hover:border-ring/40 hover:bg-accent/40 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="mt-0.5 shrink-0 text-muted-foreground">{sample.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">{sample.name}</span>
                <span className="block text-[11px] leading-tight text-muted-foreground">
                  {busy === sample.id ? "Loading…" : sample.description}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
