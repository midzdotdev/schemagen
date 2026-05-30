import { describe, expect, it } from "vitest";
import { infer } from "../../src/infer";
import type { FormatName, ObjectNode, StringNode } from "../../src/ir/types";

function stringField(ir: unknown, name: string): StringNode {
  const root = ir as ObjectNode;
  const f = root.fields[name];
  if (!f) throw new Error();
  if (f.type.kind !== "string") throw new Error("expected string");
  return f.type as StringNode;
}

const FORMAT_FIXTURES: Record<FormatName, string[]> = {
  date: ["2024-01-15", "2023-12-31", "2025-06-01", "2022-03-04", "2026-11-30"],
  "date-time": [
    "2024-01-15T10:00:00Z",
    "2024-02-03T08:30:00Z",
    "2025-06-01T23:59:59Z",
    "2026-03-05T12:34:56Z",
    "2026-04-10T00:00:00Z",
  ],
  uuid: [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "11111111-2222-3333-4444-555555555555",
    "ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb",
    "00000000-0000-0000-0000-000000000000",
    "12345678-90ab-cdef-1234-567890abcdef",
  ],
  email: [
    "ada@example.com",
    "lin@example.org",
    "ops@team.internal",
    "x@y.io",
    "alice+filter@test.dev",
  ],
  uri: [
    "https://example.com/path",
    "http://api.example.com",
    "https://docs.example.io/foo/bar",
    "https://www.example.net",
    "https://example.com",
  ],
  hostname: ["api.example.com", "docs.example.io", "www.example.net", "internal.team.dev", "x.y.z"],
  ipv4: ["192.168.1.1", "10.0.0.1", "127.0.0.1", "8.8.8.8", "172.16.0.1"],
  ipv6: [
    "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    "fe80:0000:0000:0000:0202:b3ff:fe1e:8329",
    "2001:0000:0000:0000:0000:0000:0000:0001",
    "1234:5678:9abc:def0:1234:5678:9abc:def0",
    "abcd:ef00:1234:5678:9abc:def0:1234:5678",
  ],
};

describe("format detection", () => {
  // Spec: docs/core-spec.md § "`infer`" — "format detection" + README walk-through
  it("IF1: 200 date values => format: date", () => {
    const samples = Array.from({ length: 200 }, (_, i) => ({
      d: `2024-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    }));
    expect(stringField(infer(samples), "d").format).toBe("date");
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "string" — recognized formats list
  it.each(
    Object.keys(FORMAT_FIXTURES) as FormatName[],
  )("IF2: format %s is detected when all values match", (format) => {
    const values = FORMAT_FIXTURES[format];
    const samples = values.map((v) => ({ x: v }));
    expect(stringField(infer(samples), "x").format).toBe(format);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "string" — "All constraints are AND'd"
  it("IF3: a single non-matching value => no format", () => {
    const samples = [
      { x: "2024-01-15" },
      { x: "2024-02-03" },
      { x: "2024-03-04" },
      { x: "2024-04-05" },
      { x: "not-a-date" },
    ];
    expect(stringField(infer(samples), "x").format).toBeUndefined();
  });

  // Spec: docs/core-spec.md § "`infer`" — `enable` flag
  it("IF4: formats.enable:false => no format ever set", () => {
    const samples = Array.from({ length: 10 }, () => ({ d: "2024-01-15" }));
    expect(stringField(infer(samples, { formats: { enable: false } }), "d").format).toBeUndefined();
  });

  // Spec: docs/core-spec.md § "`infer`" — `detect` whitelist
  it("IF5: formats.detect whitelist excludes other formats", () => {
    const samples = Array.from({ length: 10 }, () => ({ d: "2024-01-15" }));
    expect(
      stringField(infer(samples, { formats: { detect: ["uuid"] } }), "d").format,
    ).toBeUndefined();
  });
});
