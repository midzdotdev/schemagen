import { DataPanel } from "./components/data-panel/DataPanel";
import { SchemaPanel } from "./components/schema-tree/SchemaPanel";
import { AppHeader } from "./components/shell/AppHeader";
import { InspectorPane } from "./components/shell/InspectorPane";
import { PaneLayout } from "./components/shell/PaneLayout";
import { StorageBanner } from "./components/shell/StorageBanner";
import { TwoPaneLayout } from "./components/shell/TwoPaneLayout";
import { UIShellProvider } from "./components/shell/UIShell";
import { TooltipProvider } from "./components/ui/tooltip";
import { useStore } from "./state/store";

export function App() {
  // PR EE — drop the data pane once a schema exists; the 'Add data' button
  // in the schema header takes over the import flow.
  const ir = useStore((s) => s.ir);

  return (
    <TooltipProvider delayDuration={300}>
      <UIShellProvider>
        <div className="flex h-screen flex-col bg-background text-foreground">
          <AppHeader />
          <StorageBanner />
          <main className="flex min-h-0 flex-1 flex-col">
            {ir ? (
              <TwoPaneLayout schema={<SchemaPanel />} inspector={<InspectorPane />} />
            ) : (
              <PaneLayout
                data={<DataPanel />}
                schema={<SchemaPanel />}
                inspector={<InspectorPane />}
              />
            )}
          </main>
        </div>
      </UIShellProvider>
    </TooltipProvider>
  );
}
