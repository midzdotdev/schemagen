// X1 — persistence wiring. Reloading must preserve workspace state.
// Spec: docs/frontend-spec.md § "Persistence"

import { expect, test } from "@playwright/test";

const sample = Array.from({ length: 30 }, (_, i) => ({
  id: `00000000-0000-4000-a000-${String(i).padStart(12, "0")}`,
  status: i % 2 === 0 ? "active" : "pending",
}));

test.describe("workspace persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Clear any leftover database from prior runs.
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

  test("X1-E1: reload preserves IR and records", async ({ page }) => {
    // Import sample records.
    await page.getByLabel(/import text/i).fill(JSON.stringify(sample));
    await page.getByRole("button", { name: /^import$/i }).click();
    await expect(page.getByText("30").first()).toBeVisible();

    // Wait for the persist subscriber to flush (per-change writes are async).
    await page.waitForTimeout(200);

    // Reload — workspace must come back.
    await page.reload();
    await page.waitForSelector("h1:has-text('schemagen')");

    // Records still present.
    await expect(page.getByText("30").first()).toBeVisible();
    // Schema tree non-empty — the inferred status union should still render.
    await expect(page.getByText('"active" | "pending"').first()).toBeVisible();
  });
});
