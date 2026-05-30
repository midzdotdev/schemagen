// Filename → workspace name. Stripped extension, hyphen/underscore → space.

const DEFAULT_NAMES = new Set(["", "Untitled workspace", "Workspace"]);

export function workspaceNameFromFile(filename: string): string {
  const base = filename.replace(/\.(json|ndjson|session\.json)$/i, "");
  return base.replace(/[-_]+/g, " ").trim() || "Untitled workspace";
}

// Only overwrite the workspace name when it still has the system default —
// never clobber a name the user has set explicitly.
export function shouldRenameWorkspace(currentName: string): boolean {
  return DEFAULT_NAMES.has(currentName.trim());
}
