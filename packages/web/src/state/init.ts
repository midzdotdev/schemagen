// Initialize the workspace on app boot.
// See docs/frontend-spec.md § "Persistence".

import type { SessionBundle } from "../lib/session-bundle";
import type { WorkspaceAdapter } from "../persistence/adapter";
import { attachPersistence, createDexieAdapter } from "../persistence/dexie-adapter";
import { useStore } from "./store";

export interface InitResult {
  workspaceId: string;
  disposer: () => void;
  adapter: WorkspaceAdapter;
}

// Tracks the currently-attached persistence disposer so session import can
// swap workspaces cleanly without leaking subscribers.
let currentDisposer: (() => void) | null = null;
let currentAdapter: WorkspaceAdapter | null = null;

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
  currentDisposer?.();
  const disposer = attachPersistence(useStore, adapter);
  currentDisposer = disposer;
  currentAdapter = adapter;
  return { workspaceId: workspace.id, disposer, adapter };
}

export function getCurrentAdapter(): WorkspaceAdapter | null {
  return currentAdapter;
}

export async function loadSessionBundle(
  bundle: SessionBundle,
  adapter: WorkspaceAdapter | null = currentAdapter,
): Promise<{ workspaceId: string }> {
  if (!adapter) {
    throw new Error("loadSessionBundle: no adapter available; call initWorkspace first");
  }
  // Create a new workspace and persist everything under it.
  const workspace = await adapter.createWorkspace(bundle.workspaceName || "Imported session");
  if (bundle.ir !== null) await adapter.setIR(workspace.id, bundle.ir);
  await adapter.setRecords(workspace.id, bundle.records);
  for (const entry of bundle.history) {
    await adapter.applyChange(workspace.id, entry);
  }
  await adapter.setHistoryCursor(workspace.id, bundle.history.length);
  if (bundle.identityConfig) {
    await adapter.patchMeta(workspace.id, { identityConfig: bundle.identityConfig });
  }
  // Re-hydrate the store from the freshly-persisted workspace.
  const snapshot = await adapter.hydrate(workspace.id);
  useStore.getState().hydrate(snapshot);
  currentDisposer?.();
  currentDisposer = attachPersistence(useStore, adapter);
  return { workspaceId: workspace.id };
}
