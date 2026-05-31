// PR AA — schema-panel CTA for explicit infer.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { SchemaPanel } from "@/components/schema-tree/SchemaPanel";
import { UIShellProvider } from "@/components/shell/UIShell";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
  useStore.getState().hydrate({ workspaceId: "ws-a" });
});

function renderPanel() {
  return render(
    <UIShellProvider>
      <SchemaPanel />
    </UIShellProvider>,
  );
}

describe("SchemaPanel — explicit infer CTA", () => {
  it("AA-SP1: shows 'No schema yet' empty state when records and IR are both absent", () => {
    renderPanel();
    expect(screen.getByText(/no schema yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate schema/i })).toBeNull();
  });

  it("AA-SP2: shows the Generate schema CTA when records exist but IR is null", () => {
    act(() => {
      useStore.getState().setRecords([{ id: "a" }, { id: "b" }]);
    });
    renderPanel();
    expect(screen.getByRole("button", { name: /generate schema/i })).toBeInTheDocument();
  });

  it("AA-SP3: clicking the CTA infers and renders the schema tree", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setRecords([{ id: "a" }, { id: "b" }]);
    });
    renderPanel();
    await user.click(screen.getByRole("button", { name: /generate schema/i }));
    expect(useStore.getState().ir?.kind).toBe("object");
    // CTA is gone; tree is shown.
    expect(screen.queryByRole("button", { name: /generate schema/i })).toBeNull();
  });

  it("AA-SP4: 'Customise' opens the inference-options dialog", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setRecords([{ id: "a" }]);
    });
    renderPanel();
    await user.click(screen.getByRole("button", { name: /customise/i }));
    expect(screen.getByRole("dialog", { name: /inference options/i })).toBeInTheDocument();
  });

  it("AA-SP5: CTA summarises that defaults are in use when no overrides are set", () => {
    act(() => {
      useStore.getState().setRecords([{ id: "a" }]);
    });
    renderPanel();
    expect(screen.getByText(/strict defaults/i)).toBeInTheDocument();
  });
});
