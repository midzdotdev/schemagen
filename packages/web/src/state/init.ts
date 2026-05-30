// Process-wide WorkspaceSession singleton + thin functional shims for the
// rest of the app. New code should prefer constructing a WorkspaceSession
// directly (see state/session.ts); these shims exist so existing call sites
// don't all change at once.

import type { SessionBundle } from "@/lib/session-bundle";
import type { WorkspaceAdapter } from "@/persistence/adapter";
import { createDexieAdapter } from "@/persistence/dexie-adapter";
import { WorkspaceSession } from "@/state/session";
import { useStore } from "@/state/store";

export interface InitResult {
  workspaceId: string;
  disposer: () => void;
  adapter: WorkspaceAdapter;
}

const session = new WorkspaceSession(useStore);

export async function initWorkspace(
  adapter: WorkspaceAdapter = createDexieAdapter(),
): Promise<InitResult> {
  const { workspaceId } = await session.init(adapter);
  return {
    workspaceId,
    disposer: () => session.dispose(),
    adapter,
  };
}

export async function switchWorkspace(workspaceId: string): Promise<void> {
  await session.switchTo(workspaceId);
}

export async function createAndSwitchWorkspace(name?: string): Promise<{ workspaceId: string }> {
  return session.createAndSwitch(name);
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await session.delete(workspaceId);
}

export function getCurrentAdapter(): WorkspaceAdapter | null {
  return session.getAdapter();
}

export async function loadSessionBundle(bundle: SessionBundle): Promise<{ workspaceId: string }> {
  return session.loadBundle(bundle);
}
