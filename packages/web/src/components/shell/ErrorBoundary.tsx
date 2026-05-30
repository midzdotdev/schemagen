import { AlertOctagon, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { useStore } from "@/state/store";

interface State {
  error: Error | null;
  componentStack?: string | undefined;
}

interface Props {
  children: ReactNode;
}

// Class component because that's the only way to catch render-phase errors in
// the React tree. Render-phase = component throws while rendering OR in a
// lifecycle hook. Event handler errors don't reach here — they're caught
// inline (see Inspector.applyChange).
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface to the console so the dev tools stack trace is still there.
    // We don't pipe this anywhere else — there's no telemetry layer yet.
    console.error("ErrorBoundary caught:", error, info);
    this.setState({ error, componentStack: info.componentStack ?? undefined });
  }

  reset = (): void => {
    this.setState({ error: null, componentStack: undefined });
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorPanel
        error={this.state.error}
        componentStack={this.state.componentStack}
        onReset={this.reset}
      />
    );
  }
}

interface ErrorPanelProps {
  error: Error;
  componentStack: string | undefined;
  onReset: () => void;
}

function ErrorPanel({ error, componentStack, onReset }: ErrorPanelProps) {
  const resetWorkspace = useStore((s) => s.resetWorkspace);

  function handleResetWorkspace(): void {
    resetWorkspace();
    onReset();
  }

  function handleReload(): void {
    window.location.reload();
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-xl flex-col gap-4 rounded-lg border border-destructive/40 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-destructive/15 p-2 text-destructive">
            <AlertOctagon className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Something went wrong
            </h2>
            <p className="text-xs text-muted-foreground">
              A render crashed. Your workspace is still saved — these recovery actions don't touch
              the database unless you choose to.
            </p>
          </div>
        </div>

        <pre className="max-h-32 overflow-auto rounded-md border border-border bg-muted/50 p-2 font-mono text-[11px] leading-relaxed text-destructive">
          {error.message}
        </pre>

        {componentStack && (
          <details className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px]">
            <summary className="cursor-pointer font-medium text-muted-foreground">
              Component stack
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto font-mono text-[10px] leading-relaxed text-muted-foreground">
              {componentStack.trim()}
            </pre>
          </details>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-sm hover:bg-accent"
          >
            <RotateCcw className="size-3.5" />
            Try again
          </button>
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-sm hover:bg-accent"
          >
            Reload page
          </button>
          <button
            type="button"
            onClick={handleResetWorkspace}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground shadow-sm hover:bg-destructive/90"
          >
            Reset workspace
          </button>
        </div>
      </div>
    </div>
  );
}
