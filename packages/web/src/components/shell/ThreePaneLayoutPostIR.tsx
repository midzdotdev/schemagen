// Post-IR layout with a collapsible records sidebar.
//
// Collapsed mode: thin records strip + 70/30 schema/inspector group.
// Expanded mode: full three-pane resizable group (records / schema / inspector).
//
// The two render shapes share no DOM structure beyond panel ordering; toggling
// re-mounts the resize group. This keeps state simple (a single boolean drives
// everything) at the cost of a brief layout flash on toggle.

import type { ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

export interface ThreePaneLayoutPostIRProps {
  records: ReactNode;
  schema: ReactNode;
  inspector: ReactNode;
  collapsed: boolean;
}

// Same separator chrome as TwoPaneLayout / PaneLayout.
const SEPARATOR_CLASS = [
  "relative w-px shrink-0 self-stretch bg-border outline-none",
  "before:absolute before:inset-y-0 before:-left-[3px] before:-right-[3px] before:content-['']",
  "transition-colors",
  "data-[separator-state=hover]:bg-primary/60 data-[separator-state=drag]:bg-primary",
  "focus-visible:bg-primary",
].join(" ");

const MIN_RECORDS = 14;
const MIN_SCHEMA = 35;
const MIN_INSPECTOR = 16;

const DEFAULT_RECORDS = 22;
const DEFAULT_SCHEMA = 56;
const DEFAULT_INSPECTOR = 22;

// Collapsed mode: strip is rendered by the parent (records prop's collapsed
// branch). We use the same panel ratios as TwoPaneLayout for schema/inspector.
const COLLAPSED_SCHEMA = 70;
const COLLAPSED_INSPECTOR = 30;

export function ThreePaneLayoutPostIR({
  records,
  schema,
  inspector,
  collapsed,
}: ThreePaneLayoutPostIRProps) {
  if (collapsed) {
    return (
      <div className="flex min-h-0 flex-1">
        {records}
        <Group
          id="schemagen-postir-collapsed"
          orientation="horizontal"
          defaultLayout={{ schema: COLLAPSED_SCHEMA, inspector: COLLAPSED_INSPECTOR }}
          className="flex min-h-0 flex-1"
        >
          <Panel id="schema" minSize={MIN_SCHEMA} className="flex min-h-0 flex-col bg-background">
            <section aria-label="Schema" className="flex min-h-0 flex-1 flex-col">
              {schema}
            </section>
          </Panel>
          <Separator className={SEPARATOR_CLASS} aria-label="Resize inspector pane" />
          <Panel
            id="inspector"
            minSize={MIN_INSPECTOR}
            className="flex min-h-0 flex-col bg-card/30"
          >
            <section aria-label="Inspector" className="flex min-h-0 flex-1 flex-col">
              {inspector}
            </section>
          </Panel>
        </Group>
      </div>
    );
  }

  return (
    <Group
      id="schemagen-postir-expanded"
      orientation="horizontal"
      defaultLayout={{
        records: DEFAULT_RECORDS,
        schema: DEFAULT_SCHEMA,
        inspector: DEFAULT_INSPECTOR,
      }}
      className="flex min-h-0 flex-1"
    >
      <Panel id="records" minSize={MIN_RECORDS} className="flex min-h-0 flex-col bg-card/40">
        <section aria-label="Records" className="flex min-h-0 flex-1 flex-col">
          {records}
        </section>
      </Panel>
      <Separator className={SEPARATOR_CLASS} aria-label="Resize records pane" />
      <Panel id="schema" minSize={MIN_SCHEMA} className="flex min-h-0 flex-col bg-background">
        <section aria-label="Schema" className="flex min-h-0 flex-1 flex-col">
          {schema}
        </section>
      </Panel>
      <Separator className={SEPARATOR_CLASS} aria-label="Resize inspector pane" />
      <Panel id="inspector" minSize={MIN_INSPECTOR} className="flex min-h-0 flex-col bg-card/30">
        <section aria-label="Inspector" className="flex min-h-0 flex-1 flex-col">
          {inspector}
        </section>
      </Panel>
    </Group>
  );
}
