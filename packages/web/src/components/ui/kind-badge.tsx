import { cn } from "@/lib/cn";

// Each IR kind gets a distinct hue so a glance across the schema tree is enough
// to tell shapes apart without reading every label.
const KIND_STYLES: Record<string, string> = {
  string: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  number: "bg-sky-500/12 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  integer: "bg-sky-500/12 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  boolean: "bg-violet-500/12 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  object: "bg-amber-500/12 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  record: "bg-amber-500/12 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  array: "bg-pink-500/12 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  tuple: "bg-pink-500/12 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  null: "bg-slate-500/12 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  unknown: "bg-slate-500/12 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  union: "bg-fuchsia-500/12 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
};

export interface KindBadgeProps {
  kind: string;
  className?: string;
  children?: React.ReactNode;
}

export function KindBadge({ kind, className, children }: KindBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none",
        KIND_STYLES[kind] ?? KIND_STYLES.unknown,
        className,
      )}
    >
      {children ?? kind}
    </span>
  );
}
