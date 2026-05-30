import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { WorkspaceNameField } from "../../../src/components/shell/WorkspaceNameField";
import { useStore } from "../../../src/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("WorkspaceNameField", () => {
  it("shows the placeholder label when the store name is empty", () => {
    render(<WorkspaceNameField />);
    expect(screen.getByRole("button", { name: /untitled workspace/i })).toBeInTheDocument();
  });

  it("shows the current name from the store", () => {
    act(() => useStore.getState().setWorkspaceName("github issues"));
    render(<WorkspaceNameField />);
    expect(screen.getByRole("button", { name: /github issues/i })).toBeInTheDocument();
  });

  it("commits a new name on Enter and writes it to the store", async () => {
    const user = userEvent.setup();
    render(<WorkspaceNameField />);
    await user.click(screen.getByRole("button"));
    const input = screen.getByLabelText(/workspace name/i);
    await user.clear(input);
    await user.type(input, "stripe events{enter}");
    expect(useStore.getState().workspaceName).toBe("stripe events");
  });

  it("reverts on Escape", async () => {
    const user = userEvent.setup();
    act(() => useStore.getState().setWorkspaceName("original"));
    render(<WorkspaceNameField />);
    await user.click(screen.getByRole("button"));
    const input = screen.getByLabelText(/workspace name/i);
    await user.clear(input);
    await user.type(input, "draft{escape}");
    expect(useStore.getState().workspaceName).toBe("original");
  });
});
