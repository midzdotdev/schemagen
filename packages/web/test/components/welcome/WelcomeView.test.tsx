// PR II — WelcomeView restructure. See docs/plans/pr-ii-onboarding-review-page.md.

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WelcomeView } from "@/components/welcome/WelcomeView";
import { useStore } from "@/state/store";

// commitRecords runs through ingestAsync; mock it so a "valid" import can be
// held in-flight (II-WV4) without touching the real worker pipeline.
vi.mock("@/lib/ingest-async", () => ({
  ingestAsync: vi.fn(() => new Promise(() => {})),
}));

beforeEach(() => {
  useStore.getState().resetForTests();
  window.localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("WelcomeView", () => {
  // Plan § "File-level edit map — WelcomeView.tsx"
  it("II-WV1: paste comes before samples; file + bundle live in a disclosure", () => {
    render(<WelcomeView />);
    const paste = screen.getByLabelText(/paste json/i);
    const sample = screen.getByRole("button", { name: /hackernews/i });
    expect(paste.compareDocumentPosition(sample) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const details = screen.getByText(/more ways to start/i).closest("details");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getByLabelText(/upload data file/i)).toBeInTheDocument();
    expect(
      within(details as HTMLElement).getByLabelText(/import workspace bundle file/i),
    ).toBeInTheDocument();
  });

  // Plan § "File-level edit map — WelcomeView.tsx" — drag hint is page-global.
  it("II-WV2: the drag hint is a top-level line, outside the disclosure", () => {
    render(<WelcomeView />);
    const hint = screen.getByText(/drag a .* file anywhere on this page/i);
    expect(hint).toBeInTheDocument();
    expect(hint.closest("details")).toBeNull();
  });

  // Plan § "File-level edit map — WelcomeView.tsx" — errors render by on-ramp,
  // and a bundle error forces the disclosure open.
  it("II-WV3: a paste error renders inline; a bundle error opens the disclosure", async () => {
    const user = userEvent.setup();
    render(<WelcomeView />);

    await user.type(screen.getByLabelText(/paste json/i), "not json");
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    const details = screen.getByText(/more ways to start/i).closest("details") as HTMLElement;
    expect(details).not.toHaveAttribute("open");
    const bundleInput = screen.getByLabelText(/import workspace bundle file/i);
    await user.upload(
      bundleInput,
      new File(["{ not valid json"], "x.workspace.json", { type: "application/json" }),
    );
    await waitFor(() => expect(details).toHaveAttribute("open"));
  });

  // Plan § "File-level edit map — WelcomeView.tsx" — shared busy gate.
  it("II-WV4: an in-flight import disables the other on-ramps", async () => {
    const user = userEvent.setup();
    render(<WelcomeView />);
    await user.click(screen.getByLabelText(/paste json/i));
    await user.paste('[{"id":1}]');
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /hackernews/i })).toBeDisabled();
    });
    expect(screen.getByLabelText(/upload data file/i)).toBeDisabled();
    expect(screen.getByLabelText(/import workspace bundle file/i)).toBeDisabled();
  });
});
