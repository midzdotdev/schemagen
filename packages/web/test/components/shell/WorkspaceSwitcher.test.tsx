import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSwitcher } from "@/components/shell/WorkspaceSwitcher";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as init from "@/state/init";
import { useStore } from "@/state/store";
import { createTestAdapter } from "../../helpers/test-adapter";

function withTooltipProvider(ui: ReactNode) {
  return <TooltipProvider>{ui}</TooltipProvider>;
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
    const adapter = createTestAdapter({
      rows: [
        { id: "ws-a", name: "API schemas" },
        { id: "ws-b", name: "Stripe events" },
      ],
    });
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);

    render(withTooltipProvider(<WorkspaceSwitcher />));
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));

    await waitFor(() => {
      expect(screen.getByText(/API schemas/i)).toBeInTheDocument();
      expect(screen.getByText(/Stripe events/i)).toBeInTheDocument();
    });
  });

  it("clicking a workspace switches to it", async () => {
    const user = userEvent.setup();
    const adapter = createTestAdapter({
      rows: [
        { id: "ws-a", name: "Current" },
        { id: "ws-b", name: "Other" },
      ],
    });
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);
    const switchSpy = vi.spyOn(init, "switchWorkspace").mockResolvedValue();

    render(withTooltipProvider(<WorkspaceSwitcher />));
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText("Other"));
    await user.click(screen.getByText("Other"));

    expect(switchSpy).toHaveBeenCalledWith("ws-b");
  });

  it("'New workspace' creates and switches when the current workspace has content", async () => {
    const user = userEvent.setup();
    // Non-fresh workspace — otherwise the button is disabled.
    useStore.getState().setRecords([{ x: 1 }]);
    const adapter = createTestAdapter({ rows: [{ id: "ws-a", name: "Current" }] });
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);
    const createSpy = vi
      .spyOn(init, "createAndSwitchWorkspace")
      .mockResolvedValue({ workspaceId: "new-id" });

    render(withTooltipProvider(<WorkspaceSwitcher />));
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText(/Current/));
    await user.click(screen.getByRole("button", { name: /new workspace/i }));

    expect(createSpy).toHaveBeenCalled();
  });

  it("'New workspace' is disabled when the current workspace is fresh", async () => {
    const user = userEvent.setup();
    // beforeEach already hydrates a fresh workspace; no records / IR / history.
    const adapter = createTestAdapter({ rows: [{ id: "ws-a", name: "Current" }] });
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);

    render(withTooltipProvider(<WorkspaceSwitcher />));
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText(/Current/));
    expect(screen.getByRole("button", { name: /new workspace/i })).toBeDisabled();
  });

  // PR DD — quick-info per row replaces the header's records/schema strip.
  it("DD-S1: each workspace row shows record count and root schema kind", async () => {
    const user = userEvent.setup();
    const adapter = createTestAdapter({
      rows: [
        { id: "ws-a", name: "Current" },
        { id: "ws-b", name: "Other" },
      ],
      overrides: {
        summariseWorkspaces: vi.fn(
          async () =>
            new Map([
              ["ws-a", { recordCount: 200000, rootKind: "object" as const }],
              ["ws-b", { recordCount: 42, rootKind: "array" as const }],
            ]),
        ),
      },
    });
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);

    render(withTooltipProvider(<WorkspaceSwitcher />));
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText("Current"));
    // Count is locale-formatted; kind is shown.
    expect(screen.getByText(/200,?000.*object/i)).toBeInTheDocument();
    expect(screen.getByText(/42.*array/i)).toBeInTheDocument();
  });

  // PR BB — bundle import moves to workspace-level. The button used to live
  // in DataPanel's ImportArea, which mixed two concerns (record import vs
  // workspace creation from a snapshot).
  it("BB-S1: switcher exposes an 'Import workspace bundle' file input", async () => {
    const user = userEvent.setup();
    const adapter = createTestAdapter({ rows: [{ id: "ws-a", name: "Current" }] });
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);

    render(withTooltipProvider(<WorkspaceSwitcher />));
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText("Current"));
    expect(screen.getByLabelText(/import workspace bundle/i)).toBeInTheDocument();
  });

  it("BB-S2: selecting a valid bundle file calls loadWorkspaceBundle", async () => {
    const user = userEvent.setup();
    const adapter = createTestAdapter({ rows: [{ id: "ws-a", name: "Current" }] });
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);
    const loadSpy = vi
      .spyOn(init, "loadWorkspaceBundle")
      .mockResolvedValue({ workspaceId: "imported-ws" });

    render(withTooltipProvider(<WorkspaceSwitcher />));
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText("Current"));

    const bundle = {
      version: 1,
      workspaceName: "Imported",
      exportedAt: 0,
      originClientId: "test",
      records: [],
      history: [],
      ir: null,
    };
    const file = new File([JSON.stringify(bundle)], "bundle.session.json", {
      type: "application/json",
    });
    await user.upload(screen.getByLabelText(/import workspace bundle/i), file);

    await waitFor(() => expect(loadSpy).toHaveBeenCalled());
  });

  it("DD-S2: workspace with no IR shows a 'no schema yet' summary", async () => {
    const user = userEvent.setup();
    const adapter = createTestAdapter({
      rows: [{ id: "ws-a", name: "Fresh" }],
      overrides: {
        summariseWorkspaces: vi.fn(
          async () => new Map([["ws-a", { recordCount: 0, rootKind: null }]]),
        ),
      },
    });
    vi.spyOn(init, "getCurrentAdapter").mockReturnValue(adapter);

    render(withTooltipProvider(<WorkspaceSwitcher />));
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText("Fresh"));
    expect(screen.getByText(/no schema yet/i)).toBeInTheDocument();
  });
});
