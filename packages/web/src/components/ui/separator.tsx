import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    // Purely decorative divider — no role, just aria-hidden so screen readers
    // skip it. A semantic separator would carry implicit interaction semantics
    // we don't actually want here.
    <div
      ref={ref}
      aria-hidden
      data-orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  ),
);
Separator.displayName = "Separator";
