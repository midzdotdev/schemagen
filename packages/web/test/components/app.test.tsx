import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

afterEach(() => {
  useStore.getState().resetForTests();
});

describe("App", () => {
  // Spec: docs/frontend-spec.md § "Top-level layout"
  it("W0-1: renders the schemagen header", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /schemagen/i })).toBeInTheDocument();
  });

  // PR EE — pre-IR (with records imported) shows all three regions; post-IR
  // drops the data pane. A workspace that is truly fresh (no records, no IR)
  // shows the welcome view and is covered separately; one with records but
  // no IR shows the wizard until the user finishes it.
  it("W0-2: pre-IR with records (wizard done) renders the three top-level regions", () => {
    const workspaceId = useStore.getState().workspaceId;
    window.localStorage.setItem(
      `schemagen.uiPrefs.${workspaceId}`,
      JSON.stringify({ wizardCompleted: true }),
    );
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
    });
    render(<App />);
    expect(screen.getByRole("region", { name: /data/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /schema/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /inspector/i })).toBeInTheDocument();
  });

  it("EE-A1: post-IR drops the data region, keeps schema and inspector", () => {
    act(() => {
      useStore.getState().setIR({ kind: "object", fields: {}, additional: false });
    });
    render(<App />);
    expect(screen.queryByRole("region", { name: /^data$/i })).toBeNull();
    expect(screen.getByRole("region", { name: /schema/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /inspector/i })).toBeInTheDocument();
  });
});
