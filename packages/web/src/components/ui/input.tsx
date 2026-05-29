import { forwardRef } from "react";
import { cn } from "../../lib/cn";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-[--color-border] bg-transparent px-3 text-sm",
        "placeholder:text-[--color-muted-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
