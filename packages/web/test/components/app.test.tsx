import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "@/App";

describe("App", () => {
  // Spec: docs/frontend-spec.md § "Top-level layout"
  it("W0-1: renders the schemagen header", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /schemagen/i })).toBeInTheDocument();
  });

  // Spec: docs/frontend-spec.md § "Top-level layout"
  it("W0-2: renders the three top-level regions (Data, Schema, Inspector)", () => {
    render(<App />);
    expect(screen.getByRole("region", { name: /data/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /schema/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /inspector/i })).toBeInTheDocument();
  });
});
