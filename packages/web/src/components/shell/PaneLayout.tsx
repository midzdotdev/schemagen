// Three-pane resizable layout: Data | Schema | Inspector.
//
// Owns the Group + the resize separators and writes layout changes back
// through usePaneLayout(). The visible chrome (borders, backgrounds) lives
// here rather than on the parent so the resize separator can sit on the seam
// without needing the parent to know which side has the border.
//
// The separator is a 1px line with a wider hit area; hovering / dragging
// tints it with the primary colour so the interaction is discoverable
// without being visually loud at rest.

import type { ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { usePaneLayout } from "@/hooks/usePaneLayout";

export interface PaneLayoutProps {
  data: ReactNode;
  schema: ReactNode;
  inspector: ReactNode;
}

// Minimum sizes prevent a pane from collapsing to nothing — the Inspector
// becomes useless below ~14% and the Data pane's record list cramps below
// ~12%; centre needs room for at least the tree headers.
const MIN_SIDE = 12;
const MIN_CENTRE = 25;

const SEPARATOR_CLASS = [
  "relative w-px shrink-0 self-stretch bg-border outline-none",
  // Widen the hit target without moving the visible line.
  "before:absolute before:inset-y-0 before:-left-[3px] before:-right-[3px] before:content-['']",
  // Hover / active styling via the data-separator-state attribute set by RRP.
  "transition-colors",
  "data-[separator-state=hover]:bg-primary/60 data-[separator-state=drag]:bg-primary",
  "focus-visible:bg-primary",
].join(" ");

export function PaneLayout({ data, schema, inspector }: PaneLayoutProps) {
  const [layout, setLayout] = usePaneLayout();

  return (
    <Group
      id="schemagen-shell"
      orientation="horizontal"
      defaultLayout={layout}
      onLayoutChanged={setLayout}
      className="flex min-h-0 flex-1"
    >
      <Panel id="data" minSize={MIN_SIDE} className="flex min-h-0 flex-col bg-card/30">
        <section aria-label="Data" className="flex min-h-0 flex-1 flex-col">
          {data}
        </section>
      </Panel>
      <Separator className={SEPARATOR_CLASS} aria-label="Resize data pane" />
      <Panel id="schema" minSize={MIN_CENTRE} className="flex min-h-0 flex-col bg-background">
        <section aria-label="Schema" className="flex min-h-0 flex-1 flex-col">
          {schema}
        </section>
      </Panel>
      <Separator className={SEPARATOR_CLASS} aria-label="Resize inspector pane" />
      <Panel id="inspector" minSize={MIN_SIDE} className="flex min-h-0 flex-col bg-card/30">
        <section aria-label="Inspector" className="flex min-h-0 flex-1 flex-col">
          {inspector}
        </section>
      </Panel>
    </Group>
  );
}
