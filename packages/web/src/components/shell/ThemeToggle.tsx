import { Monitor, Moon, Sun } from "lucide-react";
import { type Theme, useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

// Sun / Moon / System trio. The trigger shows the currently-active mode's
// icon so the header can stay tight; the popover hosts the three options.
const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Active = OPTIONS.find((o) => o.value === theme)?.Icon ?? Monitor;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Theme"
          title={`Theme: ${theme}`}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded text-muted-foreground",
            "hover:bg-accent hover:text-accent-foreground",
            "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          )}
        >
          <Active className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="end">
        <ul aria-label="Theme options" className="flex flex-col gap-0.5">
          {OPTIONS.map(({ value, label, Icon }) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  theme === value && "bg-accent/60",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                <span className="flex-1">{label}</span>
                {theme === value && (
                  <span className="size-1.5 rounded-full bg-foreground" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
