// PR II — first-Generate orientation hint. See docs/plans/pr-ii-onboarding-review-page.md.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OrientationHint } from "@/components/welcome/OrientationHint";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("OrientationHint", () => {
  // Plan § "Resolved interpretations #9" — shown once, status role, inspector tip,
  // and explicitly no Cmd-Z promise.
  it("II-O1: renders the inspector hint as a status region", () => {
    act(() => useStore.getState().hydrate({ workspaceId: "ws-a" }));
    render(<OrientationHint />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("aria-live", "polite");
    expect(banner).toHaveTextContent(/click any field in the inspector to override its type/i);
    expect(banner.textContent).not.toMatch(/undo|⌘z|cmd\+?z/i);
  });

  // Plan § "Resolved interpretations #9" — dismissal persists to the UIPref bag.
  it("II-O2: dismiss writes the pref and removes the banner", async () => {
    const user = userEvent.setup();
    act(() => useStore.getState().hydrate({ workspaceId: "ws-a" }));
    render(<OrientationHint />);
    await user.click(screen.getByRole("button", { name: /dismiss hint/i }));
    expect(screen.queryByRole("status")).toBeNull();
    const bag = JSON.parse(window.localStorage.getItem("schemagen.uiPrefs.ws-a") ?? "{}");
    expect(bag.orientationHintDismissed).toBe(true);
  });

  // Plan § "Resolved interpretations #9" — per-workspace scope.
  it("II-O3: stays hidden once dismissed, but shows again on a different workspace", () => {
    window.localStorage.setItem(
      "schemagen.uiPrefs.ws-a",
      JSON.stringify({ orientationHintDismissed: true }),
    );
    act(() => useStore.getState().hydrate({ workspaceId: "ws-a" }));
    const dismissed = render(<OrientationHint />);
    expect(screen.queryByRole("status")).toBeNull();
    dismissed.unmount();

    act(() => useStore.getState().hydrate({ workspaceId: "ws-b" }));
    render(<OrientationHint />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
