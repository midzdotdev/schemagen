import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DataPanel } from "../../../src/components/data-panel/DataPanel";
import { useStore } from "../../../src/state/store";

describe("DataPanel", () => {
  beforeEach(() => {
    useStore.getState().resetForTests();
  });

  // Spec: docs/frontend-spec.md § "Data panel" — ingest pipeline
  it("W2-DP1: importing a JSON array stores deduped records and infers the IR", async () => {
    const user = userEvent.setup();
    render(<DataPanel />);
    await user.click(screen.getByLabelText(/import text/i));
    await user.paste(
      '[{"id":"a","status":"active"},{"id":"b","status":"active"},{"id":"a","status":"active"}]',
    );
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    await waitFor(() => {
      const records = useStore.getState().records;
      expect(records).toHaveLength(2); // dedup removes the third duplicate
    });
    expect(useStore.getState().ir).not.toBeNull();
  });

  // Spec: docs/frontend-spec.md § "Data panel" — re-import dedups
  it("W2-DP2: re-importing the same JSON is idempotent", async () => {
    const user = userEvent.setup();
    render(<DataPanel />);
    const json = '[{"id":1}]';
    await user.click(screen.getByLabelText(/import text/i));
    await user.paste(json);
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    await waitFor(() => expect(useStore.getState().records).toHaveLength(1));
    await user.clear(screen.getByLabelText(/import text/i));
    await user.click(screen.getByLabelText(/import text/i));
    await user.paste(json);
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    await waitFor(() => expect(useStore.getState().records).toHaveLength(1));
  });
});
