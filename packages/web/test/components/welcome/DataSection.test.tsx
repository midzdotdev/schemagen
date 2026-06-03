// PR II — Data section of the onboarding review page (was StepData).
// See docs/plans/pr-ii-onboarding-review-page.md.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { DataSection } from "@/components/welcome/DataSection";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("DataSection", () => {
  // Plan § "Page layout" — renders as a <section> named "Data", no wizard shell,
  // and shows a fallback record-count line when there's no pendingImport.
  it("II-D1: renders a Data section (no wizard shell) with the record count", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
    });
    render(<DataSection />);
    expect(screen.getByRole("region", { name: /^data$/i })).toBeInTheDocument();
    // No "1 of 3" stepper eyebrow / no Continue/Skip footer from the old shell.
    expect(screen.queryByText(/\bof 3\b/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /continue|skip/i })).toBeNull();
    expect(
      screen.getByText((_content, el) => el?.textContent === "5 records imported."),
    ).toBeInTheDocument();
  });

  // Plan § "Page layout" — clicking Change opens the RootPickerModal tree.
  it("II-D2: clicking Change opens the RootPickerModal", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
      useStore.getState().setPendingImport({
        parsed: { items: [{ id: 1 }], extras: [{ name: "x" }] },
        candidates: [
          { path: ["items"], recordCount: 1, preview: { id: 1 } },
          { path: ["extras"], recordCount: 1, preview: { name: "x" } },
        ],
      });
    });
    render(<DataSection />);
    await user.click(screen.getByRole("button", { name: /^change$/i }));
    expect(screen.getByRole("dialog", { name: /pick the records path/i })).toBeInTheDocument();
  });

  // Plan § "Page layout" — sample record renders as an expandable JsonTree.
  it("II-D3: sample record renders as an interactive JSON tree", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1, title: "Hi" }]);
    });
    render(<DataSection />);
    expect(screen.getByText(/^sample record$/i)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /sample record/i })).toBeInTheDocument();
  });

  // Plan § "Page layout" — the sample record is wrapped so long values scroll
  // within the section rather than widening the page.
  it("II-D4: sample record tree clips rather than introducing a nested scroll", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1, title: "a very long string ".repeat(20) }]);
    });
    render(<DataSection />);
    const tree = screen.getByRole("list", { name: /sample record/i });
    const wrapper = tree.closest("div");
    expect(wrapper?.className).toContain("overflow-hidden");
    expect(wrapper?.className).not.toContain("overflow-x-auto");
  });

  // Records-root summary card — surfaces the selected path + count, shown only
  // when a pendingImport exists; otherwise the fallback count line is used.
  it("II-D5: root summary surfaces the selected path + count for a single-candidate import", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
      useStore.getState().setPendingImport({
        parsed: [{ id: 1 }],
        candidates: [{ path: [], recordCount: 1, preview: { id: 1 } }],
      });
    });
    render(<DataSection />);
    expect(screen.getByText(/^records root$/i)).toBeInTheDocument();
    // The summary card's path label is a <code>; the JsonTree root label is
    // also '(root)' but lives inside <span> — scope to the <code>.
    expect(screen.getByText(/\(root\)/i, { selector: "code" })).toBeInTheDocument();
    expect(screen.getByText(/1 record/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^change$/i })).toBeInTheDocument();
  });

  it("II-D6: root summary hidden when pendingImport is null (fallback line shown)", () => {
    act(() => {
      useStore.getState().setRecords([{ id: 1 }]);
    });
    render(<DataSection />);
    expect(screen.queryByText(/^records root$/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /^change$/i })).toBeNull();
  });
});
