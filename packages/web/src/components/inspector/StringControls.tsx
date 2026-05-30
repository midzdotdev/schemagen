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
      <PatternControl pattern={node.pattern} path={path} applyChange={applyChange} />
      <Subsection title="Length">
        <div className="grid grid-cols-2 gap-2">
          <BoundField
            label="Min"
            which="minLength"
            value={node.minLength}
            path={path}
            applyChange={applyChange}
          />
          <BoundField
            label="Max"
            which="maxLength"
            value={node.maxLength}
            path={path}
            applyChange={applyChange}
          />
        </div>
      </Subsection>
    </div>
  );
}

function PatternControl({
  pattern,
  path,
  applyChange,
}: {
  pattern: string | undefined;
  path: Path;
  applyChange: (change: Change) => void;
}) {
  const [draft, setDraft] = useState(pattern ?? "");
  const [error, setError] = useState<string | null>(null);

  function commit(): void {
    setError(null);
    const next = draft.trim();
    if (!next) {
      if (pattern) applyChange({ op: "set-pattern", path, pattern: null });
      return;
    }
    try {
      new RegExp(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "invalid pattern");
      return;
    }
    if (next !== pattern) applyChange({ op: "set-pattern", path, pattern: next });
  }

  return (
    <Subsection title="Pattern">
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        <Input
          aria-label="Regex pattern"
          placeholder="^[A-Z0-9]+$"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          className="h-7 text-xs font-mono"
        />
        {pattern && (
          <Button
            size="xs"
            variant="ghost"
            type="button"
            aria-label="Clear pattern"
            onClick={() => {
              setDraft("");
              applyChange({ op: "set-pattern", path, pattern: null });
            }}
          >
            <X className="size-3" />
          </Button>
        )}
      </form>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </Subsection>
  );
}

function BoundField({
  label,
  which,
  value,
  path,
  applyChange,
}: {
  label: string;
  which: "minLength" | "maxLength";
  value: number | undefined;
  path: Path;
  applyChange: (change: Change) => void;
}) {
  const id = `string-${which}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={0}
        value={value ?? ""}
        placeholder="unset"
        className="h-7 text-xs"
        onChange={(e) => {
          const v = e.target.value === "" ? null : Number(e.target.value);
          if (v === null || !Number.isFinite(v)) {
            applyChange({ op: "set-bound", path, which, value: null });
          } else {
            applyChange({ op: "set-bound", path, which, value: v });
          }
        }}
        aria-label={`${which} bound`}
      />
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
