// Evidence tree. See docs/ir-spec.md § "Evidence is computed, not stored".

export interface EvidenceBase {
  count: number;
}

export interface UnknownEvidence extends EvidenceBase {
  kind: "unknown";
}

export interface NullEvidence extends EvidenceBase {
  kind: "null";
}

export interface BooleanEvidence extends EvidenceBase {
  kind: "boolean";
  trueCount: number;
  falseCount: number;
}

export interface NumberEvidence extends EvidenceBase {
  kind: "number";
  min?: number;
  max?: number;
  integerCount: number;
  floatCount: number;
  sampleValues: number[];
}

export interface StringEvidence extends EvidenceBase {
  kind: "string";
  values: Record<string, number>; // top-K
  cardinality: number;
  minLength?: number;
  maxLength?: number;
  sampleValues: string[]; // representative free-string examples
}

export interface ArrayEvidence extends EvidenceBase {
  kind: "array";
  lengths: { min: number; max: number; mean: number };
  items: EvidenceTree;
}

export interface TupleEvidence extends EvidenceBase {
  kind: "tuple";
  items: EvidenceTree[];
  rest?: EvidenceTree;
}

export interface ObjectEvidence extends EvidenceBase {
  kind: "object";
  fields: Record<string, FieldEvidence>;
}

export interface FieldEvidence {
  presenceCount: number;
  nullCount: number;
  valueEvidence: EvidenceTree;
}

export interface RecordEvidence extends EvidenceBase {
  kind: "record";
  values: EvidenceTree;
}

export interface UnionEvidence extends EvidenceBase {
  kind: "union";
  variants: EvidenceTree[];
  variantCounts: number[];
}

export type EvidenceTree =
  | UnknownEvidence
  | NullEvidence
  | BooleanEvidence
  | NumberEvidence
  | StringEvidence
  | ArrayEvidence
  | TupleEvidence
  | ObjectEvidence
  | RecordEvidence
  | UnionEvidence;

export interface RecordRef {
  index: number;
  record: unknown;
}
