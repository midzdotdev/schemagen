import { DataPanel } from "./components/data-panel/DataPanel";
import { RecordsSidebar } from "./components/data-panel/RecordsSidebar";
import { SchemaPanel } from "./components/schema-tree/SchemaPanel";
import { AppHeader } from "./components/shell/AppHeader";
import { InspectorPane } from "./components/shell/InspectorPane";
import { PaneLayout } from "./components/shell/PaneLayout";
import { StorageBanner } from "./components/shell/StorageBanner";
import { ThreePaneLayoutPostIR } from "./components/shell/ThreePaneLayoutPostIR";
import { UIShellProvider } from "./components/shell/UIShell";
import { TooltipProvider } from "./components/ui/tooltip";
import { useUIPref } from "./hooks/useUIPrefs";
import { useStore } from "./state/store";

export function App() {
  // Cold-start: data / schema / inspector (records are the work).
  // Post-IR: records (collapsible) / schema / inspector (schema is the work,
  // records are evidence).
  const ir = useStore((s) => s.ir);
  const workspaceId = useStore((s) => s.workspaceId);
  const [collapsed, setCollapsed] = useUIPref(workspaceId, "recordsSidebarCollapsed");

  return (
    <TooltipProvider delayDuration={300}>
      <UIShellProvider>
        <div className="flex h-screen flex-col bg-background text-foreground">
          <AppHeader />
          <StorageBanner />
          <main className="flex min-h-0 flex-1 flex-col">
            {ir ? (
              <ThreePaneLayoutPostIR
                collapsed={collapsed}
                records={
                  <RecordsSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
                }
                schema={<SchemaPanel />}
                inspector={<InspectorPane />}
              />
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
