// End-to-end walk-through. Mirrors README.md § "A walk-through".
// Spec: docs/frontend-spec.md (entire) + docs/core-spec.md § "`merge`" / § "emit"

import { expect, test } from "@playwright/test";

// Deterministic UUID-shaped strings: 8-4-4-4-12 hex chars.
function uuid(seed: number): string {
  const hex8 = seed.toString(16).padStart(8, "0");
  const hex12 = seed.toString(16).padStart(12, "0");
  return `${hex8}-1111-2222-3333-${hex12}`;
}

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

const usersExtension = Array.from({ length: 50 }, (_, i) => ({
  id: uuid(200 + i),
  email: `ext${i}@example.com`,
  status: i < 14 ? "past_due" : "active",
  signed_up_at: `2024-02-${String((i % 25) + 1).padStart(2, "0")}T10:00:00Z`,
  stripe_customer_id: `cus_${i}`,
}));

test.describe("schemagen walk-through", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Each browser context starts with an empty IndexedDB, so no clear needed.
    await page.waitForSelector("h1:has-text('schemagen')");
  });

  test("infer, validate, resolve, undo, export", async ({ page }) => {
    // Step 1-2: Import 200 records, schema is inferred.
    await page.getByLabel(/import text/i).fill(JSON.stringify(usersInitial));
    await page.getByRole("button", { name: /^import$/i }).click();

    // Schema tree should reflect the inferred IR.
    const schemaTree = page.getByRole("tree", { name: /schema/i });
    await expect(schemaTree.getByText("status").first()).toBeVisible();
    await expect(schemaTree.getByText('"active" | "pending"')).toBeVisible();
    await expect(schemaTree.getByText("avatar_url")).toBeVisible();
    await expect(schemaTree.getByText("optional").first()).toBeVisible();
    await expect(schemaTree.getByText(/string \(uuid\)/).first()).toBeVisible();

    // Step 4: Open export modal — JSON Schema preview should render.
    await page.getByRole("button", { name: /export json schema/i }).click();
    await expect(page.getByLabel(/json schema preview/i)).toContainText('"type": "object"');
    await page.getByRole("button", { name: /^close$/i }).click();

    // Step 5: Import 50 extension records.
    await page.getByLabel(/import text/i).fill(JSON.stringify(usersExtension));
    await page.getByRole("button", { name: /^import$/i }).click();

    // Step 6: Mismatches panel surfaces literal-violation + unexpected-field.
    await page.getByRole("tab", { name: /mismatches/i }).click();
    await expect(page.getByText(/literal violation/i).first()).toBeVisible();
    await expect(page.getByText(/unexpected field/i).first()).toBeVisible();

    // Step 7: Apply both suggestions.
    await page
      .getByRole("button", { name: /add "past_due" to literals/i })
      .first()
      .click();
    await expect(page.getByText(/literal violation/i)).toHaveCount(0);

    await page
      .getByRole("button", { name: /add field 'stripe_customer_id'/i })
      .first()
      .click();
    await expect(page.getByText(/unexpected field/i)).toHaveCount(0);

    // Step 8: Undo both via the History tab.
    await page.getByRole("tab", { name: /history/i }).click();
    await page.getByRole("button", { name: /^undo$/i }).click();
    await page.getByRole("button", { name: /^undo$/i }).click();

    // Mismatches reappear.
    await page.getByRole("tab", { name: /mismatches/i }).click();
    await expect(page.getByText(/literal violation/i).first()).toBeVisible();
    await expect(page.getByText(/unexpected field/i).first()).toBeVisible();

    // Redo both.
    await page.getByRole("tab", { name: /history/i }).click();
    await page.getByRole("button", { name: /^redo$/i }).click();
    await page.getByRole("button", { name: /^redo$/i }).click();

    await page.getByRole("tab", { name: /mismatches/i }).click();
    await expect(page.getByText(/literal violation/i)).toHaveCount(0);
    await expect(page.getByText(/unexpected field/i)).toHaveCount(0);

    // Step 9: Re-open the export modal — JSON Schema reflects the new state.
    await page.getByRole("button", { name: /export json schema/i }).click();
    const preview = page.getByLabel(/json schema preview/i);
    await expect(preview).toContainText("past_due");
    await expect(preview).toContainText("stripe_customer_id");
  });
});
