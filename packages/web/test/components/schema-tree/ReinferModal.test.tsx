// PR FF — re-infer reconciliation modal. See docs/plans/pr-ff-reinfer-reconcile.md.

import type { IR } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReinferModal } from "@/components/schema-tree/ReinferModal";
import { useStore } from "@/state/store";

// Current IR has id + status; records also carry a new `email` field and make
// `status` low-cardinality (→ literal union). The user manually edited status,
// so its change is a conflict; the new email field is an auto add.
const CURRENT: IR = {
  kind: "object",
  additional: false,
  fields: { id: { type: { kind: "string" } }, status: { type: { kind: "string" } } },
};
const RECORDS = Array.from({ length: 10 }, (_, i) => ({
  id: `u${i}`,
  status: i < 5 ? "a" : "b",
  email: `e${i}@x`,
}));

beforeEach(() => {
  useStore.getState().resetForTests();
  act(() => {
    useStore.getState().setIR(structuredClone(CURRENT));
    useStore.getState().setRecords(RECORDS);
    // A manual edit touching `status` → its re-infer change becomes a conflict.
    useStore
      .getState()
      .applyChange(
        { op: "set-node", path: ["status"], node: { kind: "string" } },
        { source: "manual" },
      );
  });
});

afterEach(() => vi.restoreAllMocks());

describe("ReinferModal", () => {
  // Plan § "Test plan" — FF-M1
  it("FF-M1: header summarises the auto + conflict counts", () => {
    render(<ReinferModal open onOpenChange={() => {}} />);
    expect(
      screen.getByText(/1 automatic update · 1 conflict with your edits/i),
    ).toBeInTheDocument();
  });

  // FF-M2 — Apply with autos on and conflicts kept applies only the auto batch.
  it("FF-M2: Apply applies the auto batch and leaves kept conflicts alone", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(useStore.getState(), "applyChange");
    render(<ReinferModal open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    expect(spy).toHaveBeenCalledTimes(1);
    const [change, opts] = spy.mock.calls[0] ?? [];
    expect(change?.op).toBe("batch");
    expect(opts?.source).toBe("inferred");
  });

  // FF-M3 — accepting a conflict applies that change as a manual edit.
  it("FF-M3: Accept new applies the conflict change with source manual", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(useStore.getState(), "applyChange");
    render(<ReinferModal open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /accept new/i }));
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    const manual = spy.mock.calls.find(([c]) => c.op === "set-node");
    expect(manual?.[0]).toMatchObject({ op: "set-node", path: ["status"] });
    expect(manual?.[1]?.source).toBe("manual");
  });

  // FF-M4 — keeping a conflict (the default) never applies its change.
  it("FF-M4: Keep yours (default) does not apply the conflict change", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(useStore.getState(), "applyChange");
    render(<ReinferModal open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    expect(spy.mock.calls.some(([c]) => c.op === "set-node")).toBe(false);
  });

  // FF-M5 — Apply closes; Cancel closes and applies nothing.
  it("FF-M5: Apply and Cancel both close; Cancel applies nothing", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const { unmount } = render(<ReinferModal open onOpenChange={onApply} />);
    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    expect(onApply).toHaveBeenCalledWith(false);
    unmount();

    const onCancel = vi.fn();
    const spy = vi.spyOn(useStore.getState(), "applyChange");
    render(<ReinferModal open onOpenChange={onCancel} />);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledWith(false);
    expect(spy).not.toHaveBeenCalled();
  });

  // FF-M6 — when the user and the fresh inference each broadened a literal union
  // with different values, a Merge option unions both.
  it("FF-M6: a both-broadened literal conflict offers Merge and applies the union", async () => {
    const user = userEvent.setup();
    useStore.getState().resetForTests();
    const mine: IR = {
      kind: "object",
      additional: false,
      fields: { status: { type: { kind: "string", literals: ["active", "trialing", "cancelled"] } } },
    };
    // Records cycle active/trialing/pending → fresh infers a union with `pending`.
    const recs = Array.from({ length: 15 }, (_, i) => ({
      status: ["active", "trialing", "pending"][i % 3],
    }));
    act(() => {
      useStore.getState().setIR(structuredClone(mine));
      useStore.getState().setRecords(recs);
      useStore.getState().applyChange(
        { op: "set-node", path: ["status"], node: { kind: "string", literals: ["active", "trialing", "cancelled"] } },
        { source: "manual" },
      );
    });
    const spy = vi.spyOn(useStore.getState(), "applyChange");
    render(<ReinferModal open onOpenChange={() => {}} />);

    await user.click(screen.getByRole("button", { name: /merge both/i }));
    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    const applied = spy.mock.calls.find(([c]) => c.op === "set-node");
    expect(applied?.[0]).toMatchObject({ op: "set-node", path: ["status"] });
    const node = (applied?.[0] as { node: { literals: string[] } }).node;
    expect([...node.literals].sort()).toEqual(["active", "cancelled", "pending", "trialing"]);
    expect(applied?.[1]?.source).toBe("manual");
  });
});
