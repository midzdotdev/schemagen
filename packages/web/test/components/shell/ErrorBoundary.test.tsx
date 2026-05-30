import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "@/components/shell/ErrorBoundary";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Bomb({ blow }: { blow: boolean }) {
  if (blow) throw new Error("boom");
  return <div>safe</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <Bomb blow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe")).toBeInTheDocument();
  });

  it("renders the error panel when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb blow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("'Reset workspace' calls store.resetWorkspace", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    useStore.getState().setRecords([{ a: 1 }]);
    render(
      <ErrorBoundary>
        <Bomb blow={true} />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole("button", { name: /reset workspace/i }));
    expect(useStore.getState().records).toEqual([]);
  });
});
