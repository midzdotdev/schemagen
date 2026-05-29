import addFormats from "ajv-formats";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { emit } from "../../src/emit/json-schema";
import type { IR } from "../../src/ir/types";
import { validate } from "../../src/validate";

function newAjv(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

// Build a small fixture list covering each kind. IR format names are the standard JSON Schema
// names (date, date-time, uri, ...), so ajv-formats recognizes them directly.
const fixtures: { label: string; ir: IR }[] = [
  { label: "unknown", ir: { kind: "unknown" } },
  { label: "null", ir: { kind: "null" } },
  { label: "boolean", ir: { kind: "boolean" } },
  { label: "boolean literals", ir: { kind: "boolean", literals: [true] } },
  { label: "number", ir: { kind: "number", min: 0, max: 100 } },
  { label: "integer", ir: { kind: "number", integer: true } },
  { label: "string free", ir: { kind: "string", minLength: 1, maxLength: 10 } },
  { label: "string format uuid", ir: { kind: "string", format: "uuid" } },
  { label: "string format email", ir: { kind: "string", format: "email" } },
  { label: "string format date", ir: { kind: "string", format: "date" } },
  { label: "string format date-time", ir: { kind: "string", format: "date-time" } },
  { label: "string literals", ir: { kind: "string", literals: ["a", "b"] } },
  { label: "array", ir: { kind: "array", items: { kind: "string" } } },
  {
    label: "tuple no rest",
    ir: { kind: "tuple", items: [{ kind: "string" }, { kind: "number" }] },
  },
  {
    label: "tuple with rest",
    ir: { kind: "tuple", items: [{ kind: "string" }], rest: { kind: "boolean" } },
  },
  {
    label: "object closed",
    ir: {
      kind: "object",
      fields: {
        id: { type: { kind: "string" } },
        nick: { type: { kind: "string" }, optional: true },
      },
      additional: false,
    },
  },
  {
    label: "record",
    ir: { kind: "record", values: { kind: "number" }, keyPattern: "^[a-z]+$" },
  },
  {
    label: "union anyOf",
    ir: { kind: "union", variants: [{ kind: "string" }, { kind: "number" }] },
  },
  {
    label: "union discriminated",
    ir: {
      kind: "union",
      discriminator: "kind",
      variants: [
        {
          kind: "object",
          fields: {
            kind: { type: { kind: "string", literals: ["a"] } },
            x: { type: { kind: "number" } },
          },
          additional: false,
        },
        {
          kind: "object",
          fields: {
            kind: { type: { kind: "string", literals: ["b"] } },
            y: { type: { kind: "string" } },
          },
          additional: false,
        },
      ],
    },
  },
];

describe("emit + AJV round-trip", () => {
  // Spec: docs/core-spec.md § "emit" + AJV cross-check
  it.each(fixtures)("EM_A1: ajv.compile succeeds for fixture: $label", ({ ir }) => {
    const ajv = newAjv();
    const schema = emit(ir, "json-schema");
    expect(() => ajv.compile(schema)).not.toThrow();
  });

  // Spec: docs/core-spec.md § "emit" — round-trip correctness
  it("EM_A2: AJV decisions agree with schemagen's validate (string-format-uuid records)", () => {
    const ir: IR = {
      kind: "object",
      fields: {
        id: { type: { kind: "string", format: "uuid" } },
        email: { type: { kind: "string", format: "email" } },
      },
      additional: false,
    };
    const ajv = newAjv();
    const schema = emit(ir, "json-schema");
    const validator = ajv.compile(schema);

    const records: unknown[] = [
      // valid
      { id: "0000aaaa-1111-2222-3333-444455556666", email: "user@example.com" },
      // invalid: bad uuid
      { id: "not-a-uuid", email: "user@example.com" },
      // invalid: bad email
      { id: "0000aaaa-1111-2222-3333-444455556666", email: "not-an-email" },
    ];

    for (const r of records) {
      const sg = validate(ir, r);
      const ajvOK = validator(r);
      expect({ ajv: ajvOK, sg: sg.ok }).toEqual({ ajv: sg.ok, sg: sg.ok });
    }
  });

  // Spec: docs/core-spec.md § "emit" — round-trip correctness
  it("EM_A3: AJV agrees with validate on object closed/required/literals", () => {
    const ir: IR = {
      kind: "object",
      fields: {
        id: { type: { kind: "string" } },
        status: { type: { kind: "string", literals: ["active", "pending"] } },
        nickname: { type: { kind: "string" }, optional: true },
      },
      additional: false,
    };
    const ajv = newAjv();
    const schema = emit(ir, "json-schema");
    const validator = ajv.compile(schema);

    const records: unknown[] = [
      { id: "x", status: "active" },
      { id: "x", status: "active", nickname: "y" },
      { id: "x", status: "archived" }, // literal-violation
      { id: "x" }, // missing required
      { id: "x", status: "active", extra: 1 }, // unexpected-field
    ];

    for (const r of records) {
      const sg = validate(ir, r);
      const ajvOK = validator(r);
      expect(ajvOK).toBe(sg.ok);
    }
  });
});
