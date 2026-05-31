import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSwitcher } from "@/components/shell/WorkspaceSwitcher";
import * as init from "@/state/init";
import { useStore } from "@/state/store";
import { createTestAdapter } from "../../helpers/test-adapter";

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

    render(<WorkspaceSwitcher />);
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

    render(<WorkspaceSwitcher />);
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText("Other"));
    await user.click(screen.getByText("Other"));

    expect(switchSpy).toHaveBeenCalledWith("ws-b");
  });

  it("'New workspace' creates and switches", async () => {
    const user = userEvent.setup();
    const adapter = createTestAdapter({ rows: [{ id: "ws-a", name: "Current" }] });
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

    render(<WorkspaceSwitcher />);
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText("Current"));
    // Count is locale-formatted; kind is shown.
    expect(screen.getByText(/200,?000.*object/i)).toBeInTheDocument();
    expect(screen.getByText(/42.*array/i)).toBeInTheDocument();
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

    render(<WorkspaceSwitcher />);
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await waitFor(() => screen.getByText("Fresh"));
    expect(screen.getByText(/no schema yet/i)).toBeInTheDocument();
  });
});
