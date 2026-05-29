// Banner suggesting an identity key. See docs/frontend-spec.md § "Identity-key suggestion".

import { useState } from "react";
import { useStore } from "../../state/store";
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
        className="mx-3 mb-2 block rounded border border-[--color-accent] bg-[--color-muted] p-3 text-xs"
        aria-label="Identity-key suggestion"
      >
        <p className="mb-2">
          <span className="font-medium">Identity-key suggestion:</span> {proposal.rationale}. Future
          imports of records with the same{" "}
          <code className="rounded bg-[--color-background] px-1 py-0.5 font-mono">
            {fieldsLabel}
          </code>{" "}
          will replace earlier versions instead of piling up.
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIdentityConfig({ fields: proposal.fields, onDuplicate: "replace" })}
          >
            Use {fieldsLabel}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            Pick a different field
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dismissSuggestion()}>
            Not now
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
