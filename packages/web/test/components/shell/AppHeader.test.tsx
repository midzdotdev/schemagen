// PR Z — header trigger + shell wiring for inference options.
// Plan: docs/plans/pr-z-inference-options.md § "Surfaces" — "Trigger".

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { AppHeader } from "@/components/shell/AppHeader";
import { UIShellProvider } from "@/components/shell/UIShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

function renderHeader() {
  return render(
    <TooltipProvider>
      <UIShellProvider>
        <AppHeader />
      </UIShellProvider>
    </TooltipProvider>,
  );
}

describe("AppHeader — inference options trigger", () => {
  // Plan: § "Surfaces" — "A `Sliders` / `Settings2` icon in `AppHeader`."
  // Interpretation #4: chose `Sliders`.
  it("Z-H1: renders an 'Inference options' button in the header", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /inference options/i })).toBeInTheDocument();
  });

  // Plan: § "Surfaces" — "New entry in `ModalName` union → `inference-options`."
  // Collapses original catalog T22 (UIShell renders the dialog when modal name matches):
  // click-opens-dialog covers the wiring end-to-end.
  it("Z-H2: clicking the trigger opens the InferenceOptionsDialog", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole("button", { name: /inference options/i }));
    // The dialog's content has aria-label "Inference options".
    expect(screen.getByRole("dialog", { name: /inference options/i })).toBeInTheDocument();
  });

  // PR DD — the 'N records · object schema' strip is duplicated by the schema
  // panel subtitle and tree root. Drop it; the switcher now carries the
  // per-workspace summary.
  it("DD-H1: header no longer renders the 'N records · …' summary strip", () => {
    useStore.getState().setRecords([{ id: 1 }, { id: 2 }]);
    useStore.getState().setIR({ kind: "object", fields: {}, additional: false });
    renderHeader();
    expect(screen.queryByText(/records ·/i)).toBeNull();
    expect(screen.queryByText(/object schema/i)).toBeNull();
  });

  it("DD-H2: header no longer renders the empty-state strip either", () => {
    renderHeader();
    expect(screen.queryByText(/empty · import data to begin/i)).toBeNull();
  });
});
