// PR AA — explicit cold-start infer.
//
// Renders inside SchemaPanel when records exist but no IR has been generated
// yet. Surfaces the active inference options (or "strict defaults") with a
// "Customise" link to the dialog so the user can tune before generating.

import { Sliders, Sparkles } from "lucide-react";
import { summariseOptions } from "@/lib/inference-summary";
import { useStore } from "@/state/store";
import { useUIShell } from "../shell/UIShell";
import { Button } from "../ui/button";

export function GenerateSchemaCard() {
  const records = useStore((s) => s.records);
  const inferenceOptions = useStore((s) => s.inferenceOptions);
  const inferSchema = useStore((s) => s.inferSchema);
  const { openModal } = useUIShell();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-info/10 p-3">
        <Sparkles className="size-5 text-info" aria-hidden />
      </div>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-sm font-semibold text-foreground">Generate the schema</h2>
        <p className="text-xs text-muted-foreground">
          {records.length.toLocaleString()} record{records.length === 1 ? "" : "s"} ready. schemagen
          will infer a strict first cut from them.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 text-left">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Inference options
        </div>
        <p className="text-xs text-muted-foreground">{summariseOptions(inferenceOptions)}</p>
        <Button
          variant="ghost"
          size="sm"
          className="self-start gap-1.5 text-xs"
          onClick={() => openModal("inference-options")}
        >
          <Sliders className="size-3" />
          Customise
        </Button>
      </div>
      <Button size="sm" onClick={() => inferSchema()}>
        Generate schema
      </Button>
    </div>
  );
}
