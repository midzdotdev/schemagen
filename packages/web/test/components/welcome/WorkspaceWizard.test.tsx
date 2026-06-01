// PR HH — new-workspace wizard. See docs/plans/pr-hh-workspace-wizard.md.
//
// Phase 2 covers the gate logic (when does the wizard render?) and the
// minimal scaffold that the later phases fill in.

import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { useStore } from "@/state/store";

const WS_ID = "ws-wizard";

function setWizardCompleted(workspaceId: string, completed: boolean): void {
  const key = `schemagen.uiPrefs.${workspaceId}`;
  const bag = JSON.parse(window.localStorage.getItem(key) ?? "{}");
  bag.wizardCompleted = completed;
  window.localStorage.setItem(key, JSON.stringify(bag));
}

beforeEach(() => {
  useStore.getState().resetForTests();
  useStore.getState().hydrate({ workspaceId: WS_ID });
  window.localStorage.removeItem(`schemagen.uiPrefs.${WS_ID}`);
});

describe("WorkspaceWizard — gate logic", () => {
  // Plan § "Trigger" — wizard runs when records.length > 0 && ir === null
  // && wizardCompleted === false.
  it("HH-W1: renders the wizard when records exist, no IR, wizardCompleted=false", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
    });
    render(<App />);
    expect(screen.getByRole("region", { name: /workspace wizard/i })).toBeInTheDocument();
  });

  // Plan § "Trigger" — once the user finishes (or skips) the wizard, it
  // doesn't reappear for that workspace.
  it("HH-W2: does not render when wizardCompleted=true (falls through to cold-start 3-pane)", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
    });
    setWizardCompleted(WS_ID, true);
    render(<App />);
    expect(screen.queryByRole("region", { name: /workspace wizard/i })).toBeNull();
    // Cold-start 3-pane shows the data region.
    expect(screen.getByRole("region", { name: /^data$/i })).toBeInTheDocument();
  });

  // Plan § "Trigger" — legacy guard: workspaces that already have an IR
  // (e.g. imported workspace bundles, pre-wizard installs) never see the
  // wizard, even if wizardCompleted isn't set in localStorage.
  it("HH-W3: does not render when an IR already exists (legacy guard)", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
      useStore.getState().setIR({ kind: "object", fields: {}, additional: false });
    });
    render(<App />);
    expect(screen.queryByRole("region", { name: /workspace wizard/i })).toBeNull();
  });
});
