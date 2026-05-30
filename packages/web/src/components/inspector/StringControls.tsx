import type { Change, FormatName, Path, StringNode } from "@schemagen/core";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const FORMATS: FormatName[] = [
  "date",
  "date-time",
  "uuid",
  "email",
  "uri",
  "hostname",
  "ipv4",
  "ipv6",
];

export interface StringControlsProps {
  node: StringNode;
  path: Path;
  applyChange: (change: Change) => void;
}

export function StringControls({ node, path, applyChange }: StringControlsProps) {
  const [literalDraft, setLiteralDraft] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <Subsection title="Literals" count={node.literals?.length}>
        {node.literals && node.literals.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {node.literals.map((lit) => (
              <li key={lit}>
                <span className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-xs">
                  <code className="font-mono">{JSON.stringify(lit)}</code>
                  <button
                    type="button"
                    className="ml-0.5 rounded-sm text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    onClick={() => applyChange({ op: "remove-literal", path, value: lit })}
                    aria-label={`Remove literal ${lit}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const value = literalDraft.trim();
            if (!value) return;
            applyChange({ op: "add-literal", path, value });
            setLiteralDraft("");
          }}
        >
          <Input
            aria-label="New literal"
            placeholder="add literal value"
            value={literalDraft}
            onChange={(e) => setLiteralDraft(e.target.value)}
            className="h-7 text-xs"
          />
          <Button size="xs" type="submit" disabled={!literalDraft.trim()}>
            Add
          </Button>
        </form>
        {node.literals && node.literals.length > 0 && (
          <Button
            size="xs"
            variant="ghost"
            className="self-start text-muted-foreground"
            onClick={() => applyChange({ op: "clear-literals", path })}
          >
            Clear all
          </Button>
        )}
      </Subsection>
      <Subsection title="Format">
        <div className="flex flex-wrap gap-1">
          {FORMATS.map((f) => (
            <Button
              key={f}
              size="xs"
              variant={node.format === f ? "default" : "outline"}
              onClick={() =>
                applyChange({
                  op: "set-format",
                  path,
                  format: node.format === f ? null : f,
                })
              }
            >
              {f}
            </Button>
          ))}
        </div>
      </Subsection>
    </div>
  );
}

function Subsection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-[11px] font-medium text-muted-foreground">
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-1 text-muted-foreground/60">({count})</span>
        )}
      </h3>
      {children}
    </div>
  );
}
