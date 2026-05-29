import { DataPanel } from "./components/data-panel/DataPanel";
import { SchemaTree } from "./components/schema-tree/SchemaTree";

export function App() {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-[--color-border] px-4 py-3">
        <h1 className="text-lg font-semibold">schemagen</h1>
      </header>
      <main className="grid flex-1 grid-cols-[20rem_1fr_24rem] overflow-hidden">
        <section aria-label="Data" className="border-r border-[--color-border] overflow-y-auto">
          <DataPanel />
        </section>
        <section aria-label="Schema" className="overflow-auto">
          <SchemaTree />
        </section>
        <section aria-label="Inspector" className="border-l border-[--color-border]">
          <div className="p-4 text-sm text-[--color-muted-foreground]">
            Inspector / Mismatches / History
          </div>
        </section>
      </main>
    </div>
  );
}
