import { describe, expect, it } from "vitest";
import { shouldRenameWorkspace, workspaceNameFromFile } from "../../src/lib/filename";

describe("workspaceNameFromFile", () => {
  it("strips .json", () => {
    expect(workspaceNameFromFile("github-issues.json")).toBe("github issues");
  });

  it("strips .ndjson", () => {
    expect(workspaceNameFromFile("events.ndjson")).toBe("events");
  });

  it("strips .session.json", () => {
    expect(workspaceNameFromFile("my-project.session.json")).toBe("my project");
  });

  it("turns hyphens and underscores into spaces", () => {
    expect(workspaceNameFromFile("user_records-v2.json")).toBe("user records v2");
  });

  it("falls back to a friendly default when the name is empty after stripping", () => {
    expect(workspaceNameFromFile(".json")).toBe("Untitled workspace");
  });
});

describe("shouldRenameWorkspace", () => {
  it("renames when the workspace still has the system default", () => {
    expect(shouldRenameWorkspace("")).toBe(true);
    expect(shouldRenameWorkspace("Untitled workspace")).toBe(true);
    expect(shouldRenameWorkspace("Workspace")).toBe(true);
  });

  it("preserves a user-chosen name", () => {
    expect(shouldRenameWorkspace("My API schema")).toBe(false);
  });
});
