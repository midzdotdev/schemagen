import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
  window.localStorage.clear();
});

afterEach(() => {
  useStore.getState().resetForTests();
  window.localStorage.clear();
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
  it("W0-2: pre-IR with records (onboarding done) renders the three top-level regions", () => {
    const workspaceId = useStore.getState().workspaceId;
    window.localStorage.setItem(
      `schemagen.uiPrefs.${workspaceId}`,
      JSON.stringify({ onboardingCompleted: true }),
    );
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
    });
    render(<App />);
    expect(screen.getByRole("region", { name: /data/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /schema/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /inspector/i })).toBeInTheDocument();
  });

  // PR II — onboarding review page. See docs/plans/pr-ii-onboarding-review-page.md.
  // Plan § "Trigger"
  it("II-A1: records + no IR + not onboarded renders the review page", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
    });
    render(<App />);
    expect(screen.getByRole("heading", { name: /review your data/i })).toBeInTheDocument();
    // Not the records-only cold-start, not post-IR.
    expect(screen.queryByRole("region", { name: /^data$/i })).toBeNull();
  });

  // Plan § "State + action surface" — ingest does not seed onboardingCompleted.
  it("II-A5: importing records leaves onboardingCompleted unset and routes to review", () => {
    const workspaceId = useStore.getState().workspaceId;
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
    });
    render(<App />);
    expect(screen.getByRole("heading", { name: /review your data/i })).toBeInTheDocument();
    const bag = JSON.parse(window.localStorage.getItem(`schemagen.uiPrefs.${workspaceId}`) ?? "{}");
    expect(bag.onboardingCompleted).toBeUndefined();
  });

  // Plan § "Trigger" — isFresh is independent of onboardingCompleted, so reset
  // returns to the welcome view even after onboarding.
  it("II-A6: resetWorkspace after onboarding routes back to the welcome view", () => {
    const workspaceId = useStore.getState().workspaceId;
    window.localStorage.setItem(
      `schemagen.uiPrefs.${workspaceId}`,
      JSON.stringify({ onboardingCompleted: true }),
    );
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
    });
    act(() => {
      useStore.getState().resetWorkspace();
    });
    render(<App />);
    expect(screen.getByRole("heading", { name: /welcome to your workspace/i })).toBeInTheDocument();
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
