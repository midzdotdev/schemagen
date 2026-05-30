import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { HydrationGate } from "@/components/shell/HydrationGate";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("HydrationGate", () => {
  // Spec: docs/frontend-spec.md § "Persistence" — skeleton until hydration completes
  it("X1-HG1: renders a loading state initially, then the children", async () => {
    render(
      <HydrationGate>
        <p>hydrated content</p>
      </HydrationGate>,
    );
    expect(screen.getByText(/loading workspace/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("hydrated content")).toBeInTheDocument();
    });
  });
});
