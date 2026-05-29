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

export function resolveOptions(options: InferOptions | undefined): ResolvedInferOptions {
  return {
    literals: {
      enable: options?.literals?.enable ?? true,
      maxCardinality: options?.literals?.maxCardinality ?? 20,
      maxUniqueRatio: options?.literals?.maxUniqueRatio ?? 0.3,
      minSamples: options?.literals?.minSamples ?? 5,
    },
    discriminators: {
      enable: options?.discriminators?.enable ?? true,
      fields: options?.discriminators?.fields,
    },
    formats: {
      enable: options?.formats?.enable ?? true,
      detect: options?.formats?.detect ?? "all",
    },
    numbers: {
      integerDetection: options?.numbers?.integerDetection ?? true,
      rangeMode: options?.numbers?.rangeMode ?? "evidence-only",
    },
    objects: {
      closed: options?.objects?.closed ?? true,
      optionalThreshold: options?.objects?.optionalThreshold ?? 1.0,
    },
    onTypeConflict: options?.onTypeConflict ?? "union",
  };
}
