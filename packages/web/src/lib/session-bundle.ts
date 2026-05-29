// Session bundle: a portable snapshot of a whole workspace.
// Distinct from records import — records import takes raw JSON and runs
// infer() to derive a schema; session import takes a previously-exported
// bundle and restores everything (IR with all tweaks, records, history,
// identity config). No re-inference, no tweak loss.

import type { IR, IdentityConfig } from "@schemagen/core";
import type { HistoryEntry } from "../state/types";

export interface SessionBundle {
  version: 1;
  exportedAt: number;
  originClientId: string;
  workspaceName: string;
  ir: IR | null;
  records: unknown[];
  history: HistoryEntry[];
  identityConfig: IdentityConfig | null;
}

export interface BuildBundleInput {
  workspaceName: string;
  originClientId: string;
  ir: IR | null;
  records: unknown[];
  history: HistoryEntry[];
  identityConfig: IdentityConfig | null;
  exportedAt?: number;
}

export function buildSessionBundle(input: BuildBundleInput): SessionBundle {
  return {
    version: 1,
    exportedAt: input.exportedAt ?? Date.now(),
    originClientId: input.originClientId,
    workspaceName: input.workspaceName,
    ir: input.ir,
    records: input.records,
    history: input.history,
    identityConfig: input.identityConfig,
  };
}

export type ParseResult = { ok: true; bundle: SessionBundle } | { ok: false; error: string };

export function parseSessionBundle(value: unknown): ParseResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "session bundle must be a JSON object" };
  }
  const o = value as Record<string, unknown>;
  if (o.version !== 1) {
    return {
      ok: false,
      error: `unsupported session bundle version: ${String(o.version)}; this build understands version 1`,
    };
  }
  if (!Array.isArray(o.records)) {
    return { ok: false, error: "session bundle is missing 'records'" };
  }
  if (!Array.isArray(o.history)) {
    return { ok: false, error: "session bundle is missing 'history'" };
  }
  if (typeof o.workspaceName !== "string") {
    return { ok: false, error: "session bundle is missing 'workspaceName'" };
  }
  if (typeof o.exportedAt !== "number") {
    return { ok: false, error: "session bundle is missing 'exportedAt'" };
  }
  if (typeof o.originClientId !== "string") {
    return { ok: false, error: "session bundle is missing 'originClientId'" };
  }
  return { ok: true, bundle: value as SessionBundle };
}

export function bundleSizeBytes(bundle: SessionBundle): number {
  return new Blob([JSON.stringify(bundle)]).size;
}
