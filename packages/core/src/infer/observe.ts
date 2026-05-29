// Observation tree builder. Walks samples and accumulates per-position stats
// that are later collapsed into an IR by ./build.ts.

export type ObservedType = "string" | "number" | "boolean" | "object" | "array";

export interface Observation {
  count: number; // non-null observations
  typeOrder: ObservedType[]; // first-seen order
  typeSet: Set<ObservedType>;
  // Strings
  stringValues?: Map<string, number>;
  stringMinLength?: number;
  stringMaxLength?: number;
  // Numbers
  numberValues?: Map<number, number>;
  numberMin?: number;
  numberMax?: number;
  numberIntegerCount?: number;
  numberFloatCount?: number;
  // Booleans
  booleanTrueCount?: number;
  booleanFalseCount?: number;
  // Objects
  objectFieldOrder?: string[];
  objectFields?: Map<string, FieldObservation>;
  objectShapes?: Array<{ fieldNames: Set<string>; discriminators: Map<string, string> }>;
  // Arrays
  arrayItemObservation?: Observation;
  arrayLengths?: number[];
}

export interface FieldObservation {
  presenceCount: number;
  nullCount: number;
  valueObservation: Observation;
}

export function createObservation(): Observation {
  return { count: 0, typeOrder: [], typeSet: new Set() };
}

export function observeRoot(samples: unknown[]): Observation {
  const obs = createObservation();
  for (const sample of samples) {
    observeInto(obs, sample);
  }
  return obs;
}

export function observeInto(obs: Observation, value: unknown): void {
  if (value === null) {
    // null at this position; the caller (a FieldObservation) tracks nullCount.
    return;
  }
  if (typeof value === "string") {
    addType(obs, "string");
    obs.count++;
    if (!obs.stringValues) obs.stringValues = new Map();
    obs.stringValues.set(value, (obs.stringValues.get(value) ?? 0) + 1);
    const len = value.length;
    obs.stringMinLength =
      obs.stringMinLength === undefined ? len : Math.min(obs.stringMinLength, len);
    obs.stringMaxLength =
      obs.stringMaxLength === undefined ? len : Math.max(obs.stringMaxLength, len);
    return;
  }
  if (typeof value === "number") {
    addType(obs, "number");
    obs.count++;
    if (!obs.numberValues) obs.numberValues = new Map();
    obs.numberValues.set(value, (obs.numberValues.get(value) ?? 0) + 1);
    obs.numberMin = obs.numberMin === undefined ? value : Math.min(obs.numberMin, value);
    obs.numberMax = obs.numberMax === undefined ? value : Math.max(obs.numberMax, value);
    if (Number.isInteger(value)) {
      obs.numberIntegerCount = (obs.numberIntegerCount ?? 0) + 1;
    } else {
      obs.numberFloatCount = (obs.numberFloatCount ?? 0) + 1;
    }
    return;
  }
  if (typeof value === "boolean") {
    addType(obs, "boolean");
    obs.count++;
    if (value) obs.booleanTrueCount = (obs.booleanTrueCount ?? 0) + 1;
    else obs.booleanFalseCount = (obs.booleanFalseCount ?? 0) + 1;
    return;
  }
  if (Array.isArray(value)) {
    addType(obs, "array");
    obs.count++;
    if (!obs.arrayLengths) obs.arrayLengths = [];
    obs.arrayLengths.push(value.length);
    if (!obs.arrayItemObservation) obs.arrayItemObservation = createObservation();
    for (const item of value) {
      if (item === null) {
        // Track nulls inside arrays? Items don't have nullable since arrays are homogeneous.
        // Use a sentinel by recording null in a special way — for v1, treat null items
        // as adding "null" presence to a hidden ObservedType. The arrayItemObservation
        // doesn't have a parent FieldObservation, so we encode null items via a synthetic
        // sentinel: increment count of typeSet "null-as-value" via a dedicated counter.
        // Simplest: skip null items here; null inside arrays becomes part of items via union.
        // We add a special: track nullCount on arrayItemObservation.
        (obs.arrayItemObservation as Observation & { nullCount?: number }).nullCount =
          ((obs.arrayItemObservation as Observation & { nullCount?: number }).nullCount ?? 0) + 1;
        continue;
      }
      observeInto(obs.arrayItemObservation, item);
    }
    return;
  }
  if (typeof value === "object") {
    addType(obs, "object");
    obs.count++;
    if (!obs.objectFieldOrder) obs.objectFieldOrder = [];
    if (!obs.objectFields) obs.objectFields = new Map();
    if (!obs.objectShapes) obs.objectShapes = [];

    const shape = { fieldNames: new Set<string>(), discriminators: new Map<string, string>() };
    for (const [key, sub] of Object.entries(value as Record<string, unknown>)) {
      shape.fieldNames.add(key);
      if (typeof sub === "string") shape.discriminators.set(key, sub);
      if (!obs.objectFields.has(key)) {
        obs.objectFieldOrder.push(key);
        obs.objectFields.set(key, {
          presenceCount: 0,
          nullCount: 0,
          valueObservation: createObservation(),
        });
      }
      const fo = obs.objectFields.get(key);
      if (!fo) throw new Error("unreachable: just inserted");
      fo.presenceCount++;
      if (sub === null) {
        fo.nullCount++;
      } else {
        observeInto(fo.valueObservation, sub);
      }
    }
    obs.objectShapes.push(shape);
    return;
  }
}

function addType(obs: Observation, t: ObservedType): void {
  if (!obs.typeSet.has(t)) {
    obs.typeSet.add(t);
    obs.typeOrder.push(t);
  }
}
