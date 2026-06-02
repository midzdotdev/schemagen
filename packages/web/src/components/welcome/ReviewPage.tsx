// PR II — onboarding review page. Replaces the three-step WorkspaceWizard
// (PR HH) with a single scrolling review of the imported data + identity key,
// finished by a sticky-footer Generate button.
//
// This is the Phase 2 placeholder: it establishes the routed surface (so the
// App gate and its tests are real) while the Data/Identity sections and the
// Generate handler land in later phases.
//
// See docs/plans/pr-ii-onboarding-review-page.md.

export function ReviewPage() {
  return (
    <section aria-label="Review your data" className="flex min-h-0 flex-1 flex-col">
      <header className="border-border border-b px-6 py-4">
        <h1 className="font-semibold text-foreground text-lg tracking-tight">Review your data</h1>
      </header>
    </section>
  );
}
