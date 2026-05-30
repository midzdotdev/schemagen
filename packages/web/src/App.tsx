import { useState } from "react";
import { DataPanel } from "./components/data-panel/DataPanel";
import { ExportModal } from "./components/export/ExportModal";
import { SchemaPanel } from "./components/schema-tree/SchemaPanel";
import { AppHeader } from "./components/shell/AppHeader";
import { InspectorPane } from "./components/shell/InspectorPane";
import { TooltipProvider } from "./components/ui/tooltip";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export function App() {
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useKeyboardShortcuts({
    onExportToggle: () => setExportOpen((v) => !v),
    onShortcutsToggle: () => setShortcutsOpen((v) => !v),
    onEscape: () => {
      setExportOpen(false);
      setShortcutsOpen(false);
    },
  });

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <AppHeader
          onExportClick={() => setExportOpen(true)}
          shortcutsOpen={shortcutsOpen}
          onShortcutsChange={setShortcutsOpen}
        />
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
        <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
      </div>
    </TooltipProvider>
  );
}
