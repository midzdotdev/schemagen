import { forwardRef } from "react";
import { cn } from "../../lib/cn";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md border border-[--color-border] bg-transparent px-3 py-2 text-sm font-mono",
      "placeholder:text-[--color-muted-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
