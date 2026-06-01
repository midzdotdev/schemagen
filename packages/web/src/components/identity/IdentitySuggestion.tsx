import { KeyRound, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { IdentityConfigDialog } from "./IdentityConfigDialog";

export function IdentitySuggestion() {
  const proposal = useStore((s) => s.identityProposal);
  const config = useStore((s) => s.identityConfig);
  const dismissed = useStore((s) => s.identityProposalDismissed);
  const setIdentityConfig = useStore((s) => s.setIdentityConfig);
  const dismissSuggestion = useStore((s) => s.dismissIdentitySuggestion);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!proposal || config || dismissed) return null;

  const fieldsLabel = proposal.fields.map((p) => p.join(".")).join(" + ");

  return (
    <>
      <output
        aria-label="Identity-key suggestion"
        className="block border-b border-info/30 bg-info/8 px-3 py-2.5"
      >
        <div className="flex items-start gap-2">
          <KeyRound className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">Identity key suggestion</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {proposal.rationale}. Future imports of records with the same{" "}
              <code className="rounded bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                {fieldsLabel}
              </code>{" "}
              will replace earlier versions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dismissSuggestion()}
            aria-label="Dismiss suggestion"
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <Button size="xs" onClick={() => setIdentityConfig({ fields: proposal.fields })}>
            Use {fieldsLabel}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setPickerOpen(true)}>
            Pick a different field
          </Button>
        </div>
      </output>
      <IdentityConfigDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        seedFields={proposal.fields.map((p) => p.join("."))}
      />
    </>
  );
}
