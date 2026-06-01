// PR HH — new-workspace wizard. See docs/plans/pr-hh-workspace-wizard.md.
//
// Phase 2 scaffold. Three steps (Data → Identity → Inference → Generate)
// are filled in by subsequent phases. For now this is the gated container —
// App.tsx renders it whenever a workspace has records but no IR and the
// user hasn't already finished the wizard.

export interface WorkspaceWizardProps {
  onSkip: () => void;
}

export function WorkspaceWizard(_props: WorkspaceWizardProps) {
  return (
    <section
      aria-label="Workspace wizard"
      className="mx-auto flex h-full w-full max-w-2xl flex-col gap-8 overflow-y-auto px-6 py-10"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Set up your workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Three quick steps before schemagen generates your schema.
        </p>
      </header>
      {/* Phase 3+ fill in the active step body, Back/Continue/Skip controls. */}
    </section>
  );
}
