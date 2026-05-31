import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportArea } from "@/components/data-panel/ImportArea";

describe("ImportArea", () => {
  let onRecords: ReturnType<typeof vi.fn>;
  let onNeedsPicker: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onRecords = vi.fn();
    onNeedsPicker = vi.fn();
  });

  // Spec: docs/frontend-spec.md § "Importing records"
  it("W2-IA1: pasting a JSON array and clicking Import calls onRecords", async () => {
    const user = userEvent.setup();
    render(<ImportArea onRecords={onRecords} onNeedsPicker={onNeedsPicker} />);
    await user.click(screen.getByLabelText(/import text/i));
    await user.paste('[{"id":1},{"id":2}]');
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    expect(onRecords).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
    expect(onNeedsPicker).not.toHaveBeenCalled();
  });

  // Spec: docs/frontend-spec.md § "Root picker"
  it("W2-IA2: pasting an object opens the root picker", async () => {
    const user = userEvent.setup();
    render(<ImportArea onRecords={onRecords} onNeedsPicker={onNeedsPicker} />);
    await user.click(screen.getByLabelText(/import text/i));
    await user.paste('{"users":[{"a":1}]}');
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    expect(onNeedsPicker).toHaveBeenCalled();
    const arg = onNeedsPicker.mock.calls[0]?.[1] as Array<{ path: string[] }>;
    expect(arg.map((c) => c.path)).toContainEqual(["users"]);
  });

  // Spec: docs/frontend-spec.md § "Importing records"
  it("W2-IA3: pasting a primitive shows an error and does not call callbacks", async () => {
    const user = userEvent.setup();
    render(<ImportArea onRecords={onRecords} onNeedsPicker={onNeedsPicker} />);
    await user.click(screen.getByLabelText(/import text/i));
    await user.paste("42");
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(onRecords).not.toHaveBeenCalled();
  });

  // Spec: docs/frontend-spec.md § "Importing records"
  it("W2-IA4: Import is disabled when textarea is empty", () => {
    render(<ImportArea onRecords={onRecords} onNeedsPicker={onNeedsPicker} />);
    expect(screen.getByRole("button", { name: /^import$/i })).toBeDisabled();
  });

  // PR BB — bundle import moved out; ImportArea is records-only now.
  it("BB-I1: ImportArea no longer exposes the session-bundle import", () => {
    render(<ImportArea onRecords={onRecords} onNeedsPicker={onNeedsPicker} />);
    expect(screen.queryByLabelText(/import session/i)).toBeNull();
  });
});
