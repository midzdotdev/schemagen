// HydrationGate — renders a 1-line skeleton until the workspace is hydrated.
// See docs/frontend-spec.md § "Persistence".

import { type ReactNode, useEffect, useState } from "react";
import { initWorkspace } from "@/state/init";

export interface HydrationGateProps {
  children: ReactNode;
}

export function HydrationGate({ children }: HydrationGateProps) {
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let disposer: (() => void) | undefined;
    initWorkspace()
      .then((result) => {
        if (cancelled) {
          result.disposer();
          return;
        }
        disposer = result.disposer;
        setHydrated(true);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "failed to load workspace");
      });
    return () => {
      cancelled = true;
      disposer?.();
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-destructive">
        Failed to load workspace: {error}
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground"
        aria-busy="true"
      >
        Loading workspace…
      </div>
    );
  }

  return <>{children}</>;
}
