// WorkspaceSession — owns the adapter, the active disposer, and the lifecycle
// operations (init / switch / create-and-switch / delete / load-bundle).
//
// This used to be three module-level `let`s in init.ts (currentAdapter,
// currentDisposer, and an implicit "store"). That worked at runtime but made
// the lifecycle untestable in isolation and hid the adapter coupling. The
// session class encapsulates all of it; init.ts is a thin shim that exposes
// a process-wide singleton instance for production code while letting tests
// construct their own.

import type { WorkspaceBundle } from "@/lib/workspace-bundle";
import type { WorkspaceAdapter } from "@/persistence/adapter";
import { attachPersistence } from "@/persistence/dexie-adapter";
import type { useStore as UseStore } from "@/state/store";

type StoreLike = typeof UseStore;

export class WorkspaceSession {
  private adapter: WorkspaceAdapter | null = null;
  private disposer: (() => void) | null = null;

  constructor(private readonly store: StoreLike) {}

  // Boot the session against a given adapter. Picks the most-recently-updated
  // workspace; mints one if the DB is empty.
  async init(adapter: WorkspaceAdapter): Promise<{ workspaceId: string }> {
    const workspaces = await adapter.listWorkspaces();
    const existing = workspaces.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    const workspace = existing ?? (await adapter.createWorkspace());
    await this.adopt(adapter, workspace.id);
    return { workspaceId: workspace.id };
  }

  // Switch to an existing workspace by id. Throws if init() hasn't run.
  async switchTo(workspaceId: string): Promise<void> {
    const adapter = this.requireAdapter("switchTo");
    await this.adopt(adapter, workspaceId);
  }

  async createAndSwitch(name?: string): Promise<{ workspaceId: string }> {
    const adapter = this.requireAdapter("createAndSwitch");
    const row = await adapter.createWorkspace(name);
    await this.switchTo(row.id);
    return { workspaceId: row.id };
  }

  // Cascade-delete a workspace. If it's the current one, switch to another
  // first (or mint a fresh one) so the store never references a deleted id.
  async delete(workspaceId: string): Promise<void> {
    const adapter = this.requireAdapter("delete");
    const isCurrent = this.store.getState().workspaceId === workspaceId;
    if (isCurrent) {
      const all = await adapter.listWorkspaces();
      const next = all.find((w) => w.id !== workspaceId);
      if (next) await this.switchTo(next.id);
      else await this.createAndSwitch();
    }
    await adapter.deleteWorkspace(workspaceId);
  }

  // Materialize a workspace bundle into a brand-new workspace and switch to it.
  // Bundle import is intentionally non-overwriting: it mints a fresh workspace
  // so the user's current one is untouched.
  async loadBundle(bundle: WorkspaceBundle): Promise<{ workspaceId: string }> {
    const adapter = this.requireAdapter("loadBundle");
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
    await this.adopt(adapter, workspace.id);
    return { workspaceId: workspace.id };
  }

  // Test/inspector accessors. Production callers should prefer the methods.
  getAdapter(): WorkspaceAdapter | null {
    return this.adapter;
  }

  dispose(): void {
    this.disposer?.();
    this.disposer = null;
  }

  // Hydrate the store, swap the persistence subscriber. The single point of
  // mutation for both pieces — every lifecycle method routes through here.
  private async adopt(adapter: WorkspaceAdapter, workspaceId: string): Promise<void> {
    const snapshot = await adapter.hydrate(workspaceId);
    this.store.getState().hydrate(snapshot);
    this.disposer?.();
    this.disposer = attachPersistence(this.store, adapter);
    this.adapter = adapter;
  }

  private requireAdapter(op: string): WorkspaceAdapter {
    if (!this.adapter) {
      throw new Error(`WorkspaceSession.${op}: no adapter; call init() first`);
    }
    return this.adapter;
  }
}
