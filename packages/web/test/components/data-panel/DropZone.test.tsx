import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DropZone } from "../../../src/components/data-panel/DropZone";

// jsdom lacks a DataTransfer constructor; build a minimal stand-in.
function dataTransferLike(file: File): unknown {
  return {
    files: [file],
    items: [{ kind: "file" }],
  };
}

describe("DropZone", () => {
  // Spec: docs/frontend-spec.md § "Importing records" — drag-and-drop accepts JSON
  it("X5-DZ1: dropping a .json file calls onRecords", async () => {
    const onRecords = vi.fn();
    const onNeedsPicker = vi.fn();
    render(
      <DropZone onRecords={onRecords} onNeedsPicker={onNeedsPicker}>
        <p>data panel</p>
      </DropZone>,
    );
    const file = new File(['[{"id":1},{"id":2}]'], "data.json", { type: "application/json" });
    const zone = screen.getByTestId("data-dropzone");
    fireEvent.dragOver(zone, { dataTransfer: dataTransferLike(file) });
    fireEvent.drop(zone, { dataTransfer: dataTransferLike(file) });
    await new Promise((r) => setTimeout(r, 30));
    expect(onRecords).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
  });

  // Spec: docs/frontend-spec.md § "Importing records" — non-JSON silently ignored
  it("X5-DZ2: dropping a non-JSON file is silently ignored", async () => {
    const onRecords = vi.fn();
    const onNeedsPicker = vi.fn();
    render(
      <DropZone onRecords={onRecords} onNeedsPicker={onNeedsPicker}>
        <p>data panel</p>
      </DropZone>,
    );
    const file = new File(["hello"], "data.txt", { type: "text/plain" });
    fireEvent.drop(screen.getByTestId("data-dropzone"), { dataTransfer: dataTransferLike(file) });
    await new Promise((r) => setTimeout(r, 10));
    expect(onRecords).not.toHaveBeenCalled();
    expect(onNeedsPicker).not.toHaveBeenCalled();
  });
});
