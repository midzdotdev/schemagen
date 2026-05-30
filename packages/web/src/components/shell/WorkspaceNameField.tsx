import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useStore } from "@/state/store";

// Click-to-edit workspace name. Reads/writes useStore.workspaceName.
// Submits on Enter or blur; Escape reverts.
export function WorkspaceNameField() {
  const name = useStore((s) => s.workspaceName);
  const setName = useStore((s) => s.setWorkspaceName);
  const id = useId();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const displayName = name.trim() || "Untitled workspace";

  function commit(): void {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) setName(trimmed);
    else if (!trimmed) setDraft(name);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        id={id}
        aria-label="Workspace name"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") {
            setDraft(name);
            setEditing(false);
          }
        }}
        onBlur={commit}
        className="h-6 w-44 rounded border border-input bg-background px-1.5 text-sm font-medium leading-none text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Rename workspace"
      className={cn(
        "max-w-[14rem] truncate rounded px-1 py-0.5 text-sm font-medium leading-none",
        "text-foreground hover:bg-accent hover:text-accent-foreground",
        !name.trim() && "text-muted-foreground",
      )}
    >
      {displayName}
    </button>
  );
}
