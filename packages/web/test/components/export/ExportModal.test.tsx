import type { IR } from "@schemagen/core";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { ExportModal } from "../../../src/components/export/ExportModal";
import { useStore } from "../../../src/state/store";

const ir: IR = {
  kind: "object",
  fields: { id: { type: { kind: "string", format: "uuid" } } },
  additional: false,
};

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("ExportModal", () => {
  // Spec: docs/frontend-spec.md § "Export panel"
  it("W7-EM1: shows a 'no data' placeholder when no IR is set", () => {
    render(<ExportModal open onOpenChange={() => {}} />);
    expect(screen.getByLabelText(/json schema preview/i)).toHaveTextContent(/import data/i);
  });

  // Spec: docs/frontend-spec.md § "Export panel"
  it("W7-EM2: renders the JSON Schema preview from the current IR", () => {
    act(() => {
      useStore.getState().setIR(ir);
    });
    render(<ExportModal open onOpenChange={() => {}} />);
    const pre = screen.getByLabelText(/json schema preview/i);
    expect(pre.textContent).toMatch(/"type": "object"/);
    expect(pre.textContent).toMatch(/"format": "uuid"/);
    expect(pre.textContent).toMatch(/"\$schema":/);
  });

  // Spec: docs/frontend-spec.md § "Export panel"
  it("W7-EM3: Copy and Download buttons are present when IR is loaded", () => {
    act(() => {
      useStore.getState().setIR(ir);
    });
    render(<ExportModal open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: /^copy$/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^download$/i })).toBeEnabled();
  });
});
