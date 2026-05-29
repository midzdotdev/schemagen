import addFormats from "ajv-formats";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { Change } from "../../src/changes/types";
import { emit } from "../../src/emit/json-schema";
import { proposeIdentityKey } from "../../src/identity/propose";
import { infer } from "../../src/infer";
import type { ObjectNode, StringNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

function uuid(i: number): string {
  // deterministic uuid-like
  const hex = i.toString(16).padStart(8, "0");
  return `${hex}-1111-2222-3333-${hex.padStart(12, "0")}`;
}

// Use (i % 25) for day-of-month so days don't align with i%4 (avatar_url
// cadence) or i%2 (status cadence) — this avoids spurious discriminator
// detection on signed_up_at. The README's walk-through implies a flat object
// IR; this fixture ensures the default inference produces that.
const usersInitial = Array.from({ length: 200 }, (_, i) => {
  const status = i % 2 === 0 ? "active" : "pending";
  const base = {
    id: uuid(i),
    email: `user${i}@example.com`,
    status,
    signed_up_at: `2024-01-${String((i % 25) + 1).padStart(2, "0")}T10:00:00Z`,
  };
  return i % 4 === 0 ? base : { ...base, avatar_url: `https://cdn.example.com/u/${i}.png` };
});

const usersExtension = Array.from({ length: 50 }, (_, i) => {
  const status = i < 14 ? "past_due" : "active";
  return {
    id: uuid(200 + i),
    email: `ext${i}@example.com`,
    status,
    signed_up_at: `2024-02-${String((i % 25) + 1).padStart(2, "0")}T10:00:00Z`,
    stripe_customer_id: `cus_${i}`,
  };
});

describe("e2e walk-through", () => {
  // Spec: README walk-through step 2
  it("E2E1: infer detects status literal union, optional avatar_url, and formats", () => {
    const ir = infer(usersInitial);
    expect(ir.kind).toBe("object");
    const obj = ir as ObjectNode;

    // status is literal union
    const statusType = obj.fields.status?.type;
    expect(statusType?.kind).toBe("string");
    if (statusType?.kind === "string") {
      expect(statusType.literals).toBeDefined();
      const literals = statusType.literals ?? [];
      expect(literals).toEqual(expect.arrayContaining(["active", "pending"]));
    }

    // avatar_url present-but-optional
    const avatarEntry = obj.fields.avatar_url;
    expect(avatarEntry).toBeDefined();
    expect(avatarEntry?.optional).toBe(true);

    // formats
    const idType = obj.fields.id?.type as StringNode;
    expect(idType.format).toBe("uuid");
    const emailType = obj.fields.email?.type as StringNode;
    expect(emailType.format).toBe("email");
    const dtType = obj.fields.signed_up_at?.type as StringNode;
    expect(dtType.format).toBe("iso-datetime");
  });

  // Spec: README walk-through "identity-key suggestion" + core-spec § "`proposeIdentityKey`"
  it("E2E2: proposeIdentityKey returns `id` with high confidence", () => {
    const proposal = proposeIdentityKey(usersInitial);
    expect(proposal).not.toBeNull();
    expect(proposal?.fields).toEqual([["id"]]);
    expect(proposal?.confidence.uniqueness).toBeGreaterThanOrEqual(0.99);
    expect(proposal?.confidence.presence).toBeGreaterThanOrEqual(0.99);
  });

  // Spec: README walk-through step 3 + core-spec § "Invertibility"
  it("E2E3: wrap-in-union on ['status'] is invertible", () => {
    const ir = infer(usersInitial);
    const wrap: Change = {
      op: "wrap-in-union",
      path: ["status"],
      with: { kind: "string" },
    };
    const { ir: wrapped, inverse } = applyChange(ir, wrap);
    expect(wrapped).not.toEqual(ir);
    const { ir: restored } = applyChange(wrapped, inverse);
    expect(restored).toEqual(ir);
  });

  // Spec: README walk-through step 4
  // Interpretation: per task note, validate the extension against the *original*
  // inferred IR (no wrap-in-union applied). Then literal-violation and
  // unexpected-field are both guaranteed.
  it("E2E4: validating extension against inferred IR surfaces literal + unexpected mismatches", () => {
    const ir = infer(usersInitial);
    const result = validate(ir, usersExtension);
    expect(result.ok).toBe(false);

    const litViolation = result.mismatches.find(
      (m) => m.kind === "literal-violation" && m.actual.value === "past_due",
    );
    expect(litViolation).toBeDefined();

    const unexpected = result.mismatches.find(
      (m) => m.kind === "unexpected-field" && m.path[m.path.length - 1] === "stripe_customer_id",
    );
    expect(unexpected).toBeDefined();
  });

  // Spec: README walk-through step 4
  it("E2E5: applying both suggested changes clears the specific mismatches", () => {
    const ir = infer(usersInitial);
    const initial = validate(ir, usersExtension);

    // Find first suggestion for past_due literal-violation
    const litMismatch = initial.mismatches.find(
      (m) => m.kind === "literal-violation" && m.actual.value === "past_due",
    );
    const unexMismatch = initial.mismatches.find(
      (m) => m.kind === "unexpected-field" && m.path[m.path.length - 1] === "stripe_customer_id",
    );
    expect(litMismatch).toBeDefined();
    expect(unexMismatch).toBeDefined();

    let cur = ir;
    const litChange = litMismatch?.suggestions[0]?.change;
    const unexChange = unexMismatch?.suggestions[0]?.change;
    expect(litChange).toBeDefined();
    expect(unexChange).toBeDefined();
    if (litChange) cur = applyChange(cur, litChange).ir;
    if (unexChange) cur = applyChange(cur, unexChange).ir;

    const recheck = validate(cur, usersExtension);
    expect(
      recheck.mismatches.some(
        (m) => m.kind === "literal-violation" && m.actual.value === "past_due",
      ),
    ).toBe(false);
    expect(
      recheck.mismatches.some(
        (m) => m.kind === "unexpected-field" && m.path[m.path.length - 1] === "stripe_customer_id",
      ),
    ).toBe(false);
  });

  // Spec: README walk-through step 5 + core-spec § "emit"
  it("E2E6: emitted JSON Schema decisions agree with schemagen.validate on both fixtures", () => {
    // Build the "merged" IR by applying suggestions from E2E5
    const baseIR = infer(usersInitial);
    const initial = validate(baseIR, usersExtension);
    const litMismatch = initial.mismatches.find(
      (m) => m.kind === "literal-violation" && m.actual.value === "past_due",
    );
    const unexMismatch = initial.mismatches.find(
      (m) => m.kind === "unexpected-field" && m.path[m.path.length - 1] === "stripe_customer_id",
    );
    let merged = baseIR;
    const litChange = litMismatch?.suggestions[0]?.change;
    const unexChange = unexMismatch?.suggestions[0]?.change;
    if (litChange) merged = applyChange(merged, litChange).ir;
    if (unexChange) merged = applyChange(merged, unexChange).ir;

    const schema = emit(merged, "json-schema");
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validator = ajv.compile(schema);

    const allRecords: unknown[] = [...usersInitial, ...usersExtension];
    let disagreements = 0;
    for (const r of allRecords) {
      const sg = validate(merged, r);
      const ajvOK = validator(r);
      if (ajvOK !== sg.ok) disagreements++;
    }
    expect(disagreements).toBe(0);
  });
});
