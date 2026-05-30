import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShortcutsDialog } from "@/components/shell/ShortcutsDialog";

describe("ShortcutsDialog", () => {
  it("renders each shortcut with its key chord and description", () => {
    render(<ShortcutsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/undo the most recent change/i)).toBeInTheDocument();
    expect(screen.getByText(/toggle the export modal/i)).toBeInTheDocument();
    expect(screen.getByText(/open this shortcuts dialog/i)).toBeInTheDocument();
    // ⌘E should appear as two kbd elements
    expect(screen.getByText("E")).toBeInTheDocument();
  });
});
