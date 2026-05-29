// X2 — identity-key auto-suggest and logical dedup.
// Spec: docs/frontend-spec.md § "Identity-key suggestion"

import { expect, test } from "@playwright/test";

const sample = Array.from({ length: 30 }, (_, i) => ({
  id: `00000000-0000-4000-a000-${String(i).padStart(12, "0")}`,
  status: i % 2 === 0 ? "active" : "pending",
  v: 1,
}));

const sampleUpdated = sample.map((r) => ({ ...r, v: 2 }));

test.describe("identity-key auto-suggest + dedup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("schemagen");
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
      localStorage.removeItem("schemagen.clientId");
    });
    await page.reload();
    await page.waitForSelector("h1:has-text('schemagen')");
  });

  test("X2-E1: banner appears, accepting it dedups subsequent imports", async ({ page }) => {
    // First import — banner should appear suggesting `id`.
    await page.getByLabel(/import text/i).fill(JSON.stringify(sample));
    await page.getByRole("button", { name: /^import$/i }).click();
    await expect(page.getByLabel(/identity-key suggestion/i)).toBeVisible();

    // Accept the proposal.
    await page.getByRole("button", { name: /^use id$/i }).click();
    await expect(page.getByLabel(/identity-key suggestion/i)).not.toBeVisible();

    // Now import 30 records with the same IDs but different content.
    // Logical dedup under `replace` should keep the count at 30.
    await page.getByLabel(/import text/i).fill(JSON.stringify(sampleUpdated));
    await page.getByRole("button", { name: /^import$/i }).click();

    // Record count stays at 30 (logical dedup, not bloat to 60).
    const recordsList = page.getByRole("list", { name: /records/i });
    await expect(recordsList.locator("li")).toHaveCount(30);
  });
});
