// Initialize the workspace on app boot.
// See docs/frontend-spec.md § "Persistence".

import type { WorkspaceAdapter } from "../persistence/adapter";
import { attachPersistence, createDexieAdapter } from "../persistence/dexie-adapter";
import { useStore } from "./store";

export interface InitResult {
  workspaceId: string;
  disposer: () => void;
  adapter: WorkspaceAdapter;
}

export async function initWorkspace(
  adapter: WorkspaceAdapter = createDexieAdapter(),
): Promise<InitResult> {
  const workspaces = await adapter.listWorkspaces();
  let workspace = workspaces.sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (!workspace) {
    workspace = await adapter.createWorkspace();
  }
  const snapshot = await adapter.hydrate(workspace.id);
  useStore.getState().hydrate(snapshot);
  const disposer = attachPersistence(useStore, adapter);
  return { workspaceId: workspace.id, disposer, adapter };
}
