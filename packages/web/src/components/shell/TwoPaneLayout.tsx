// PR EE — post-IR layout. After the user generates a schema, the data
// panel collapses into an 'Add data' button on the schema header — the
// schema is what the user is working with from here on. Records are still
// importable; they're just one click away rather than always-on real estate.

import type { ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

export interface TwoPaneLayoutProps {
  schema: ReactNode;
  inspector: ReactNode;
}

// Static 70/30 split. Post-IR the user mostly works in the tree; the inspector
// is a side console. A persisted/resizable variant isn't worth the storage
// bookkeeping for v1.
const SCHEMA_DEFAULT = 70;
const INSPECTOR_DEFAULT = 30;
const MIN_SCHEMA = 40;
const MIN_INSPECTOR = 18;

const SEPARATOR_CLASS = [
  "relative w-px shrink-0 self-stretch bg-border outline-none",
  "before:absolute before:inset-y-0 before:-left-[3px] before:-right-[3px] before:content-['']",
  "transition-colors",
  "data-[separator-state=hover]:bg-primary/60 data-[separator-state=drag]:bg-primary",
  "focus-visible:bg-primary",
].join(" ");

export function TwoPaneLayout({ schema, inspector }: TwoPaneLayoutProps) {
  return (
    <Group
      id="schemagen-shell-2pane"
      orientation="horizontal"
      defaultLayout={{ schema: SCHEMA_DEFAULT, inspector: INSPECTOR_DEFAULT }}
      className="flex min-h-0 flex-1"
    >
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
