import { Fragment, useMemo } from "react";
import { cn } from "@/lib/cn";

export interface JsonViewProps {
  value: unknown;
  // Pre-stringified value, used when you've already serialized (e.g. JSON Schema
  // emit output). Bypasses the JSON.stringify pass.
  text?: string;
  className?: string;
  // Wrap value with aria-label so the snapshot is discoverable in tests.
  "aria-label"?: string;
}

type Token =
  | { kind: "key"; value: string }
  | { kind: "string"; value: string }
  | { kind: "number"; value: string }
  | { kind: "boolean"; value: string }
  | { kind: "null"; value: string }
  | { kind: "punct"; value: string }
  | { kind: "ws"; value: string };

// Tokenizer is intentionally small — it's only ever fed JSON.stringify output
// (or core's emit() output), both of which are well-formed. Streaming over the
// string with a tiny state machine is plenty for our scale.
function tokenize(json: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < json.length) {
    const c = json[i];
    if (c === " " || c === "\n" || c === "\t" || c === "\r") {
      let j = i;
      while (j < json.length && /\s/.test(json[j] as string)) j += 1;
      tokens.push({ kind: "ws", value: json.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "{" || c === "}" || c === "[" || c === "]" || c === "," || c === ":") {
      tokens.push({ kind: "punct", value: c });
      i += 1;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < json.length) {
        if (json[j] === "\\") {
          j += 2;
          continue;
        }
        if (json[j] === '"') break;
        j += 1;
      }
      j += 1; // include closing quote
      const raw = json.slice(i, j);
      // Look ahead past whitespace for a colon — that's how we tell a key
      // from a value without tracking grammar state.
      let k = j;
      while (k < json.length && /\s/.test(json[k] as string)) k += 1;
      const isKey = json[k] === ":";
      tokens.push({ kind: isKey ? "key" : "string", value: raw });
      i = j;
      continue;
    }
    if (c === "t" || c === "f") {
      const word = json.startsWith("true", i)
        ? "true"
        : json.startsWith("false", i)
          ? "false"
          : null;
      if (word) {
        tokens.push({ kind: "boolean", value: word });
        i += word.length;
        continue;
      }
    }
    if (c === "n" && json.startsWith("null", i)) {
      tokens.push({ kind: "null", value: "null" });
      i += 4;
      continue;
    }
    if (c === "-" || (c && c >= "0" && c <= "9")) {
      let j = i;
      while (j < json.length && /[-+0-9.eE]/.test(json[j] as string)) j += 1;
      tokens.push({ kind: "number", value: json.slice(i, j) });
      i = j;
      continue;
    }
    // Unrecognised byte — emit verbatim so we never crash on a surprise input.
    tokens.push({ kind: "ws", value: c as string });
    i += 1;
  }
  return tokens;
}

const CLASS_FOR: Record<Token["kind"], string> = {
  key: "text-foreground/85 font-medium",
  string: "text-emerald-600 dark:text-emerald-400",
  number: "text-sky-600 dark:text-sky-400",
  boolean: "text-violet-600 dark:text-violet-400",
  null: "text-violet-600 dark:text-violet-400",
  punct: "text-muted-foreground",
  ws: "",
};

export function JsonView({ value, text, className, "aria-label": ariaLabel }: JsonViewProps) {
  const source = text ?? JSON.stringify(value, null, 2);
  const tokens = useMemo(() => (source ? tokenize(source) : []), [source]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: <section> would imply landmark semantics; this is a code preview
    <pre
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed",
        className,
      )}
    >
      {tokens.length === 0 ? (
        <span className="text-muted-foreground">{source || "(empty)"}</span>
      ) : (
        tokens.map((t, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional
          <Fragment key={i}>
            <span className={CLASS_FOR[t.kind]}>{t.value}</span>
          </Fragment>
        ))
      )}
    </pre>
  );
}
