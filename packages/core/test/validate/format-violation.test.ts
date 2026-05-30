import { describe, expect, it } from "vitest";
import type { FormatName, ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

const BAD_VALUES: Record<FormatName, string> = {
  uuid: "not-a-uuid",
  date: "01-15-2024",
  "date-time": "yesterday at noon",
  email: "no-at-sign",
  uri: "not a url",
  ipv4: "999.999.999.999",
  ipv6: "g123::xyz",
  hostname: "-invalid-.host..",
};

describe("validate format-violation", () => {
  // Spec: docs/core-spec.md § "MismatchKind" — `format-violation`
  it("V_FV1: string format:'uuid', value 'not-a-uuid' => format-violation", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { id: { type: { kind: "string", format: "uuid" } } },
      additional: false,
    };
    const result = validate(ir, { id: "not-a-uuid" });
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]?.kind).toBe("format-violation");
    expect(result.mismatches[0]?.path).toEqual(["id"]);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "`string`" — recognized formats
  it.each(
    Object.keys(BAD_VALUES) as FormatName[],
  )("V_FV2: format %s triggers its own violation with a clearly-malformed value", (fmt) => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { x: { type: { kind: "string", format: fmt } } },
      additional: false,
    };
    const result = validate(ir, { x: BAD_VALUES[fmt] });
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]?.kind).toBe("format-violation");
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "`string`" — "Open set"
  // Interpretation: unrecognized format names are not enforced and never produce format-violation mismatches.
  it("V_FV3: unknown format string in IR => not validated, never violation", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { x: { type: { kind: "string", format: "some-custom-format" } } },
      additional: false,
    };
    const result = validate(ir, { x: "literally anything 123" });
    const formatMismatches = result.mismatches.filter((m) => m.kind === "format-violation");
    expect(formatMismatches).toEqual([]);
  });
});
