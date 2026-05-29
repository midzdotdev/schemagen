// "Show example records" — finds records whose value at the given path
// exists (and optionally satisfies a predicate). See docs/frontend-spec.md
// § "Schema tree" + § "Mismatch panel".

import { findExamples } from "@schemagen/core";
import { Search } from "lucide-react";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";

export interface ExamplesButtonProps {
  predicate?: (value: unknown) => boolean;
  label?: string;
  size?: "default" | "sm";
}

export function ExamplesButton({
  predicate,
  label = "Show example records",
  size = "sm",
}: ExamplesButtonProps) {
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  const selectedPath = useStore((s) => s.selectedPath);
  const setSelectedRecordIndices = useStore((s) => s.setSelectedRecordIndices);

  if (!ir || !selectedPath) return null;

  return (
    <Button
      size={size}
      variant="outline"
      onClick={() => {
        const refs = findExamples(ir, records, selectedPath, predicate, 20);
        setSelectedRecordIndices(refs.map((r) => r.index));
      }}
    >
      <Search className="mr-1 h-3 w-3" />
      {label}
    </Button>
  );
}
