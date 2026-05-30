import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSwitcher } from "@/components/shell/WorkspaceSwitcher";
import type { WorkspaceAdapter } from "@/persistence/adapter";
import * as init from "@/state/init";
import { useStore } from "@/state/store";

function fakeAdapter(rows: { id: string; name: string }[]): WorkspaceAdapter {
  return {
    listWorkspaces: vi.fn(async () => rows.map((r) => ({ ...r, createdAt: 0, updatedAt: 100 }))),
    createWorkspace: vi.fn(async (name?: string) => ({
      id: "new-id",
      name: name ?? "Untitled workspace",
      createdAt: 0,
      updatedAt: 100,
    })),
    renameWorkspace: vi.fn(async () => {}),
    hydrate: vi.fn(async (workspaceId: string) => ({ workspaceId, workspaceName: "" })),
    setIR: vi.fn(async () => {}),
    setRecords: vi.fn(async () => {}),
    applyChange: vi.fn(async () => {}),
    deleteChange: vi.fn(async () => {}),
    setHistoryCursor: vi.fn(async () => {}),
    setSyncCursor: vi.fn(async () => {}),
    patchMeta: vi.fn(async () => {}),
  };
}

beforeEach(() => {
  useStore.getState().resetForTests();
  useStore.getState().hydrate({ workspaceId: "ws-a" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WorkspaceSwitcher", () => {
  it("opens the popover and lists workspaces from the adapter", async () => {
    const user = userEvent.setup();
    const adapter = fakeAdapter([
      { id: "ws-a", name: "API schemas" },
      { id: "ws-b", name: "Stripe events" },
    ]);
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);

    render(<WorkspaceSwitcher />);
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));

    await waitFor(() => {
      expect(screen.getByText(/API schemas/i)).toBeInTheDocument();
      expect(screen.getByText(/Stripe events/i)).toBeInTheDocument();
    });
  });

  it("clicking a workspace switches to it", async () => {
    const user = userEvent.setup();
    const adapter = fakeAdapter([
      { id: "ws-a", name: "Current" },
      { id: "ws-b", name: "Other" },
    ]);
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);
    const switchSpy = vi.spyOn(init, "switchWorkspace").mockResolvedValue();

    render(<WorkspaceSwitcher />);
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText("Other"));
    await user.click(screen.getByText("Other"));

    expect(switchSpy).toHaveBeenCalledWith("ws-b");
  });

  it("'New workspace' creates and switches", async () => {
    const user = userEvent.setup();
    const adapter = fakeAdapter([{ id: "ws-a", name: "Current" }]);
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);
    const createSpy = vi
      .spyOn(init, "createAndSwitchWorkspace")
      .mockResolvedValue({ workspaceId: "new-id" });

    render(<WorkspaceSwitcher />);
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText(/Current/));
    await user.click(screen.getByRole("button", { name: /new workspace/i }));

    expect(createSpy).toHaveBeenCalled();
  });
});

// Avoid an unused warning when act isn't reached because all tests are async.
void act;
