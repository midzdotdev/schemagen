import { cn } from "@/lib/cn";

export interface PaneHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PaneHeader({ title, description, icon, actions, className }: PaneHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-3",
        className,
      )}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {description && (
          <span className="truncate text-[11px] text-muted-foreground/80">{description}</span>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}
