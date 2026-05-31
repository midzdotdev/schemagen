import { DataPanel } from "./components/data-panel/DataPanel";
import { SchemaPanel } from "./components/schema-tree/SchemaPanel";
import { AppHeader } from "./components/shell/AppHeader";
import { InspectorPane } from "./components/shell/InspectorPane";
import { StorageBanner } from "./components/shell/StorageBanner";
import { UIShellProvider } from "./components/shell/UIShell";
import { TooltipProvider } from "./components/ui/tooltip";

export function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <UIShellProvider>
        <div className="flex h-screen flex-col bg-background text-foreground">
          <AppHeader />
          <StorageBanner />
          <main className="grid min-h-0 flex-1 grid-cols-[20rem_minmax(0,1fr)_24rem]">
            <section
              aria-label="Data"
              className="flex min-h-0 flex-col border-r border-border bg-card/30"
            >
              <DataPanel />
            </section>
            <section aria-label="Schema" className="flex min-h-0 flex-col bg-background">
              <SchemaPanel />
            </section>
            <section
              aria-label="Inspector"
              className="flex min-h-0 flex-col border-l border-border bg-card/30"
            >
              <InspectorPane />
            </section>
          </main>
        </div>
      </UIShellProvider>
    </TooltipProvider>
  );
}
