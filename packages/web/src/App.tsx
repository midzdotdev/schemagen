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
import { WelcomeView } from "./components/welcome/WelcomeView";
import { WorkspaceWizard } from "./components/welcome/WorkspaceWizard";
import { useUIPref } from "./hooks/useUIPrefs";
import { useStore } from "./state/store";

export function App() {
  // Four modes of the main content area:
  //   - Fresh workspace (no records, no IR) → WelcomeView
  //   - Records but no IR + wizard not done → WorkspaceWizard
  //   - Records but no IR + wizard done → cold-start 3-pane (data | schema CTA | inspector)
  //   - IR exists → records sidebar | schema | inspector
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  const workspaceId = useStore((s) => s.workspaceId);
  const [collapsed, setCollapsed] = useUIPref(workspaceId, "recordsSidebarCollapsed");
  const [onboardingCompleted, setOnboardingCompleted] = useUIPref(
    workspaceId,
    "onboardingCompleted",
  );

  const isFresh = ir === null && records.length === 0;
  const inWizard = ir === null && records.length > 0 && !onboardingCompleted;

  return (
    <TooltipProvider delayDuration={300}>
      <UIShellProvider>
        <div className="flex h-screen flex-col bg-background text-foreground">
          <AppHeader />
          {/* Storage banner only when there's actual workspace state at risk.
              On the welcome view and wizard the warning is noise — the user
              is still onboarding. */}
          {!isFresh && !inWizard && <StorageBanner />}
          <main className="flex min-h-0 flex-1 flex-col">
            {isFresh ? (
              <WelcomeView />
            ) : inWizard ? (
              <WorkspaceWizard onComplete={() => setOnboardingCompleted(true)} />
            ) : ir ? (
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
