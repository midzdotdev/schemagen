import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ["⌘", "Z"], description: "Undo the most recent change" },
  { keys: ["⌘", "⇧", "Z"], description: "Redo the most recently undone change" },
  { keys: ["⌘", "E"], description: "Toggle the Export modal" },
  { keys: ["?"], description: "Open this shortcuts dialog" },
  { keys: ["Esc"], description: "Close any open modal" },
];

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Keyboard shortcuts" className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Shortcuts use ⌘ on macOS and Ctrl elsewhere. They stand down when an input or textarea
            is focused.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-1.5">
          {SHORTCUTS.map(({ keys, description }) => (
            <li
              key={description}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
            >
              <span className="text-xs text-muted-foreground">{description}</span>
              <div className="flex shrink-0 items-center gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-background px-1.5 font-mono text-[11px] font-medium text-foreground shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
