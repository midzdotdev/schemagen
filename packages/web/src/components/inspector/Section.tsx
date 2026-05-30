// Shared section / subsection primitives for the Inspector pane.
//
// Section = top-level grouping with a divider above and a small uppercase
// label (e.g. "Common", "String", "Object"). Subsection = inner grouping
// inside a Section (e.g. "Literals", "Format", "Length"). Three different
// implementations used to live across Inspector, ArrayControls, and
// StringControls; this consolidates them.

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InspectorSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function InspectorSection({ title, children, className }: InspectorSectionProps) {
  return (
    <div className={cn("border-b border-border last:border-b-0", className)}>
      <div className="px-3 pt-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}

export interface InspectorSubsectionProps {
  title: string;
  // Show "(N)" beside the title, useful for "Literals (3)" / "Fields (12)".
  count?: number | undefined;
  children: ReactNode;
  className?: string;
}

export function InspectorSubsection({
  title,
  count,
  children,
  className,
}: InspectorSubsectionProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <h3 className="text-[11px] font-medium text-muted-foreground">
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-1 text-muted-foreground/60">({count})</span>
        )}
      </h3>
      {children}
    </div>
  );
}
