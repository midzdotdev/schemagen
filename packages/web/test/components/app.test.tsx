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

  // PR EE — pre-IR shows all three regions; post-IR drops the data pane.
  it("W0-2: pre-IR renders the three top-level regions", () => {
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
