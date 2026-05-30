import type { IR } from "@schemagen/core";
import { describe, expect, it } from "vitest";
import { computeFilter, emptyFilter } from "@/components/schema-tree/filter";

const ir: IR = {
  kind: "object",
  fields: {
    id: { type: { kind: "string" } },
    user: {
      type: {
        kind: "object",
        fields: {
          login: { type: { kind: "string" } },
          avatar_url: { type: { kind: "string", format: "uri" } },
        },
        additional: false,
      },
    },
    status: { type: { kind: "string" } },
  },
  additional: false,
};

describe("computeFilter", () => {
  it("empty query returns an empty filter", () => {
    expect(computeFilter(ir, "")).toEqual(emptyFilter());
    expect(computeFilter(ir, "   ")).toEqual(emptyFilter());
  });

  it("matches a top-level field by substring (case-insensitive)", () => {
    const r = computeFilter(ir, "STAT");
    expect(r.visible.has("status")).toBe(true);
    // The root is included so the ancestor chain to the match is expandable.
    expect(r.visible.has("")).toBe(true);
    expect(r.expand.has("")).toBe(true);
  });

  it("matches a nested field and includes its ancestor chain", () => {
    const r = computeFilter(ir, "avatar");
    expect(r.visible.has("user.avatar_url")).toBe(true);
    expect(r.visible.has("user")).toBe(true);
    expect(r.visible.has("")).toBe(true);
    expect(r.expand.has("user")).toBe(true);
  });

  it("excludes siblings of the match", () => {
    const r = computeFilter(ir, "avatar");
    expect(r.visible.has("user.login")).toBe(false);
    expect(r.visible.has("id")).toBe(false);
    expect(r.visible.has("status")).toBe(false);
  });
});
