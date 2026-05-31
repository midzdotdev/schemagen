// Inference options. See docs/core-spec.md § "`infer`".

import type { FormatName } from "../ir/types";

export interface InferOptions {
  literals?: {
    enable?: boolean;
    maxCardinality?: number;
    maxUniqueRatio?: number;
    minSamples?: number;
  };
  discriminators?: {
    enable?: boolean;
    fields?: string[];
  };
  formats?: {
    enable?: boolean;
    detect?: FormatName[] | "all";
  };
  numbers?: {
    integerDetection?: boolean;
    rangeMode?: "off" | "evidence-only" | "constraint";
  };
  objects?: {
    closed?: boolean;
    optionalThreshold?: number;
  };
  onTypeConflict?: "union" | "unknown";
}

export interface ResolvedInferOptions {
  literals: { enable: boolean; maxCardinality: number; maxUniqueRatio: number; minSamples: number };
  discriminators: { enable: boolean; fields: string[] | undefined };
  formats: { enable: boolean; detect: FormatName[] | "all" };
  numbers: { integerDetection: boolean; rangeMode: "off" | "evidence-only" | "constraint" };
  objects: { closed: boolean; optionalThreshold: number };
  onTypeConflict: "union" | "unknown";
}

// Single source of truth for option defaults. Read by `resolveOptions` here and
// by the @schemagen/web inference-options dialog — see PR Z. Treat as immutable.
export const INFER_OPTION_DEFAULTS: ResolvedInferOptions = {
  literals: { enable: true, maxCardinality: 20, maxUniqueRatio: 0.3, minSamples: 5 },
  discriminators: { enable: true, fields: undefined },
  formats: { enable: true, detect: "all" },
  numbers: { integerDetection: true, rangeMode: "evidence-only" },
  objects: { closed: true, optionalThreshold: 1.0 },
  onTypeConflict: "union",
};

export function resolveOptions(options: InferOptions | undefined): ResolvedInferOptions {
  const d = INFER_OPTION_DEFAULTS;
  return {
    literals: {
      enable: options?.literals?.enable ?? d.literals.enable,
      maxCardinality: options?.literals?.maxCardinality ?? d.literals.maxCardinality,
      maxUniqueRatio: options?.literals?.maxUniqueRatio ?? d.literals.maxUniqueRatio,
      minSamples: options?.literals?.minSamples ?? d.literals.minSamples,
    },
    discriminators: {
      enable: options?.discriminators?.enable ?? d.discriminators.enable,
      fields: options?.discriminators?.fields,
    },
    formats: {
      enable: options?.formats?.enable ?? d.formats.enable,
      detect: options?.formats?.detect ?? d.formats.detect,
    },
    numbers: {
      integerDetection: options?.numbers?.integerDetection ?? d.numbers.integerDetection,
      rangeMode: options?.numbers?.rangeMode ?? d.numbers.rangeMode,
    },
    objects: {
      closed: options?.objects?.closed ?? d.objects.closed,
      optionalThreshold: options?.objects?.optionalThreshold ?? d.objects.optionalThreshold,
    },
    onTypeConflict: options?.onTypeConflict ?? d.onTypeConflict,
  };
}
