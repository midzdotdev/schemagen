import { useState } from "react";
import { DataPanel } from "./components/data-panel/DataPanel";
import { ExportModal } from "./components/export/ExportModal";
import { SchemaTree } from "./components/schema-tree/SchemaTree";
import { SidePanel } from "./components/shell/SidePanel";
import { Button } from "./components/ui/button";

export function App() {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[--color-border] px-4 py-3">
        <h1 className="text-lg font-semibold">schemagen</h1>
        <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}>
          Export JSON Schema
        </Button>
      </header>
      <main className="grid flex-1 grid-cols-[20rem_1fr_24rem] overflow-hidden">
        <section aria-label="Data" className="overflow-y-auto border-r border-[--color-border]">
          <DataPanel />
        </section>
        <section aria-label="Schema" className="overflow-auto">
          <SchemaTree />
        </section>
        <section aria-label="Inspector" className="border-l border-[--color-border]">
          <SidePanel />
        </section>
      </main>
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
