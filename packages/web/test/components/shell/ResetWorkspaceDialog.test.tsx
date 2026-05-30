import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { ResetWorkspaceDialog } from "../../../src/components/shell/ResetWorkspaceDialog";
import { useStore } from "../../../src/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("ResetWorkspaceDialog", () => {
  it("Cancel closes without clearing state", async () => {
    const user = userEvent.setup();
    act(() => useStore.getState().setRecords([{ id: 1 }]));
    const opened: boolean[] = [true];
    render(
      <ResetWorkspaceDialog
        open={true}
        onOpenChange={(v) => {
          opened.push(v);
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(useStore.getState().records).toHaveLength(1);
    expect(opened).toContain(false);
  });

  it("Reset button clears the workspace content", async () => {
    const user = userEvent.setup();
    act(() => {
      useStore.getState().setWorkspaceName("kept");
      useStore.getState().setRecords([{ id: 1 }, { id: 2 }]);
    });
    render(<ResetWorkspaceDialog open={true} onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /reset workspace/i }));
    expect(useStore.getState().records).toEqual([]);
    expect(useStore.getState().workspaceName).toBe("kept");
  });
});
