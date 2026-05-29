import type { Change, FormatName, Path, StringNode } from "@schemagen/core";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const FORMATS: FormatName[] = [
  "iso-date",
  "iso-datetime",
  "uuid",
  "email",
  "url",
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
    <div className="flex flex-col gap-3 pt-3">
      <Section title="Literals">
        {node.literals && (
          <ul className="flex flex-wrap gap-1">
            {node.literals.map((lit) => (
              <li key={lit} className="flex items-center gap-1">
                <code className="rounded bg-[--color-muted] px-1.5 py-0.5 text-xs">{lit}</code>
                <button
                  type="button"
                  className="text-xs text-[--color-muted-foreground] hover:text-red-600"
                  onClick={() => applyChange({ op: "remove-literal", path, value: lit })}
                  aria-label={`Remove literal ${lit}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex items-center gap-2"
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
            placeholder="value"
            value={literalDraft}
            onChange={(e) => setLiteralDraft(e.target.value)}
          />
          <Button size="sm" type="submit" disabled={!literalDraft.trim()}>
            Add literal
          </Button>
        </form>
        {node.literals && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => applyChange({ op: "clear-literals", path })}
          >
            Clear all literals
          </Button>
        )}
      </Section>
      <Section title="Format">
        <div className="flex flex-wrap gap-1">
          {FORMATS.map((f) => (
            <Button
              key={f}
              size="sm"
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
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[--color-muted-foreground]">
        {title}
      </h3>
      {children}
    </div>
  );
}
