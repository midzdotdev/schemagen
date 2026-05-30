import { beforeEach, describe, expect, it } from "vitest";
import { WorkspaceSession } from "@/state/session";
import { useStore } from "@/state/store";
import { createTestAdapter } from "../helpers/test-adapter";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("WorkspaceSession", () => {
  it("init() picks the most-recently-updated workspace and hydrates the store", async () => {
    const adapter = createTestAdapter({
      rows: [
        { id: "ws-old", name: "Old" },
        { id: "ws-new", name: "New" },
      ],
    });
    // Mark ws-new as newer
    const original = adapter.listWorkspaces;
    adapter.listWorkspaces = async () => {
      const rows = await original();
      return rows.map((r) => (r.id === "ws-new" ? { ...r, updatedAt: 1_000_000 } : r));
    };
    const session = new WorkspaceSession(useStore);
    const { workspaceId } = await session.init(adapter);
    expect(workspaceId).toBe("ws-new");
    expect(useStore.getState().workspaceId).toBe("ws-new");
  });

  it("init() mints a fresh workspace when the DB is empty", async () => {
    const adapter = createTestAdapter({ rows: [] });
    const session = new WorkspaceSession(useStore);
    const { workspaceId } = await session.init(adapter);
    expect(workspaceId).toMatch(/^new-/);
    expect(adapter.createWorkspace).toHaveBeenCalled();
  });

  it("switchTo() hydrates the new workspace's snapshot", async () => {
    const adapter = createTestAdapter({
      rows: [
        { id: "ws-a", name: "A" },
        { id: "ws-b", name: "B" },
      ],
    });
    const session = new WorkspaceSession(useStore);
    await session.init(adapter);
    await session.switchTo("ws-b");
    expect(useStore.getState().workspaceId).toBe("ws-b");
  });

  it("delete() switches to another workspace before removing the current one", async () => {
    const adapter = createTestAdapter({
      rows: [
        { id: "ws-a", name: "A" },
        { id: "ws-b", name: "B" },
      ],
    });
    const session = new WorkspaceSession(useStore);
    await session.init(adapter);
    // Force-current ws-a
    await session.switchTo("ws-a");
    await session.delete("ws-a");
    expect(useStore.getState().workspaceId).toBe("ws-b");
    expect(adapter.deleteWorkspace).toHaveBeenCalledWith("ws-a");
  });

  it("delete() mints a fresh workspace when removing the last one", async () => {
    const adapter = createTestAdapter({ rows: [{ id: "ws-only", name: "only" }] });
    const session = new WorkspaceSession(useStore);
    await session.init(adapter);
    await session.delete("ws-only");
    expect(adapter.createWorkspace).toHaveBeenCalledTimes(1);
    expect(adapter.deleteWorkspace).toHaveBeenCalledWith("ws-only");
  });

  it("requireAdapter throws when called before init()", async () => {
    const session = new WorkspaceSession(useStore);
    await expect(session.switchTo("any")).rejects.toThrow(/no adapter/);
  });
});
