// PR II — one-time orientation hint shown above the schema panel right after
// the first Generate. Points the user at the inspector (the main thing that's
// clickable post-IR) and then gets out of the way. Per-workspace dismissal so
// it appears once per new workspace, matching UIPrefs' scope.
//
// Deliberately a single sentence — no walkthrough, no spotlight. The Cmd-Z
// undo tip was dropped because keyboard shortcuts stand down inside inputs,
// the exact context a user would reach for it.
//
// See docs/plans/pr-ii-onboarding-review-page.md.

import { Lightbulb, X } from "lucide-react";
import { useUIPref } from "@/hooks/useUIPrefs";
import { useStore } from "@/state/store";

export function OrientationHint() {
  const workspaceId = useStore((s) => s.workspaceId);
  const [dismissed, setDismissed] = useUIPref(workspaceId, "orientationHintDismissed");

  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex shrink-0 items-center gap-2 border-info/30 border-b bg-info/8 px-4 py-2 text-xs"
    >
      <Lightbulb className="size-3.5 shrink-0 text-info" aria-hidden />
      <p className="min-w-0 flex-1 text-foreground">
        Click any field in the inspector to override its type.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss hint"
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
