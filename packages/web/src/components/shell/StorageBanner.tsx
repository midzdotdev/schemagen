import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { requestPersistence, useStorageHealth } from "@/hooks/useStorageHealth";
import { Button } from "../ui/button";

const DISMISS_KEY = "schemagen.storageBanner.dismissed";

// Surfaces a banner above the app when storage is in a fragile state:
//   - ephemeral: browser hasn't granted persistent storage; data may be evicted
//   - near-quota: > 85% of available quota in use
// Dismissed-state is sticky across the session (and reload — localStorage)
// so the user isn't nagged after acknowledging.
export function StorageBanner() {
  const status = useStorageHealth();
  const [dismissed, setDismissed] = useLocalStorage<boolean>(DISMISS_KEY, false);
  const [persisting, setPersisting] = useState(false);
  const [granted, setGranted] = useState<boolean | null>(null);

  if (dismissed) return null;
  if (status.kind === "ok" || status.kind === "unknown") return null;

  function dismiss(): void {
    setDismissed(true);
  }

  async function tryPersist(): Promise<void> {
    setPersisting(true);
    const ok = await requestPersistence();
    setGranted(ok);
    setPersisting(false);
    if (ok) dismiss();
  }

  return (
    <div
      role="status"
      className="flex shrink-0 items-start gap-2 border-b border-warning/40 bg-warning/8 px-4 py-2 text-xs"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        {status.kind === "ephemeral" ? (
          <>
            <p className="font-medium text-foreground">
              Your workspaces aren't marked as persistent storage.
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Some browsers (notably Safari) evict non-persistent IndexedDB after a week of
              inactivity. Export your work as a session bundle if you can't grant persistence.
              {granted === false && (
                <span className="ml-1 text-warning">Browser declined the request.</span>
              )}
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-foreground">
              Storage is {Math.round(status.usagePct * 100)}% full.
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Schemagen needs room for records, history, and meta. Consider exporting and deleting
              older workspaces.
            </p>
          </>
        )}
      </div>
      {status.kind === "ephemeral" && (
        <Button size="xs" variant="outline" onClick={tryPersist} disabled={persisting}>
          <ShieldCheck className="size-3" />
          {persisting ? "Asking…" : "Make persistent"}
        </Button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
