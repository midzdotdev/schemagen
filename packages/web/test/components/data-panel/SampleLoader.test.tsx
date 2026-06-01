import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SampleLoader } from "@/components/data-panel/SampleLoader";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SampleLoader", () => {
  it("lists the bundled samples", () => {
    render(<SampleLoader onRecords={() => {}} onNeedsPicker={() => {}} />);
    expect(screen.getByText(/hackernews top stories/i)).toBeInTheDocument();
    expect(screen.getByText(/star wars characters/i)).toBeInTheDocument();
    expect(screen.getByText(/open library/i)).toBeInTheDocument();
  });

  it("fetches the sample and opens the root picker with the candidates", async () => {
    const user = userEvent.setup();
    const records = [{ id: 1 }, { id: 2 }];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify(records) })),
    );
    const onNeedsPicker = vi.fn();
    render(<SampleLoader onRecords={() => {}} onNeedsPicker={onNeedsPicker} />);
    await user.click(screen.getByRole("button", { name: /hackernews top stories/i }));
    await waitFor(() =>
      expect(onNeedsPicker).toHaveBeenCalledWith(
        records,
        expect.arrayContaining([expect.objectContaining({ path: [], recordCount: 2 })]),
      ),
    );
  });

  it("surfaces a fetch error in an alert", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, text: async () => "" })),
    );
    render(<SampleLoader onRecords={() => {}} onNeedsPicker={() => {}} />);
    await user.click(screen.getByRole("button", { name: /hackernews top stories/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/fetch failed/i));
  });

  it("renames the workspace from the sample filename when default", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, text: async () => "[{}]" })),
    );
    render(<SampleLoader onRecords={() => {}} onNeedsPicker={() => {}} />);
    await user.click(screen.getByRole("button", { name: /hackernews top stories/i }));
    await waitFor(() => {
      expect(useStore.getState().workspaceName).toBe("hackernews top");
    });
  });
});
