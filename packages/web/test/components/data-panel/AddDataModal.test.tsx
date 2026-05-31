// PR EE — Add Data modal owns post-IR record imports.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddDataModal } from "@/components/data-panel/AddDataModal";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
  useStore.getState().setIR({ kind: "object", fields: {}, additional: false });
});

describe("AddDataModal", () => {
  it("EE-M1: renders the import textarea and a Preview button", () => {
    render(<AddDataModal open onOpenChange={() => {}} />);
    expect(screen.getByLabelText(/import text/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preview/i })).toBeInTheDocument();
  });

  it("EE-M2: previewing shows the count of records that would be added", async () => {
    const user = userEvent.setup();
    render(<AddDataModal open onOpenChange={() => {}} />);
    await user.click(screen.getByLabelText(/import text/i));
    await user.paste('[{"id":"a"},{"id":"b"}]');
    await user.click(screen.getByRole("button", { name: /preview/i }));
    expect(await screen.findByText(/2 new records/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /commit/i })).toBeInTheDocument();
  });

  it("EE-M3: preview surfaces duplicate counts when some records already exist", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setRecords([{ id: "a" }]);
    });
    render(<AddDataModal open onOpenChange={() => {}} />);
    await user.click(screen.getByLabelText(/import text/i));
    await user.paste('[{"id":"a"},{"id":"b"}]');
    await user.click(screen.getByRole("button", { name: /preview/i }));
    // 1 new, 1 duplicate.
    expect(await screen.findByText(/1 new record/i)).toBeInTheDocument();
    expect(screen.getByText(/1.*duplicate/i)).toBeInTheDocument();
  });

  it("EE-M4: committing writes the deduped records to the store and closes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<AddDataModal open onOpenChange={onOpenChange} />);
    await user.click(screen.getByLabelText(/import text/i));
    await user.paste('[{"id":"a"},{"id":"b"}]');
    await user.click(screen.getByRole("button", { name: /preview/i }));
    await user.click(await screen.findByRole("button", { name: /commit/i }));
    expect(useStore.getState().records).toHaveLength(2);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("EE-M5: cancel discards without changing records", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    act(() => {
      useStore.getState().setRecords([{ id: "x" }]);
    });
    render(<AddDataModal open onOpenChange={onOpenChange} />);
    await user.click(screen.getByLabelText(/import text/i));
    await user.paste('[{"id":"a"}]');
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(useStore.getState().records).toEqual([{ id: "x" }]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
