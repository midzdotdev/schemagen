// X4 — session export/import.
// Spec: docs/frontend-spec.md § "Export panel"

import { expect, test } from "@playwright/test";

const initialRecords = Array.from({ length: 10 }, (_, i) => ({
  id: `00000000-0000-4000-a000-${String(i).padStart(12, "0")}`,
  status: "active",
}));

test.describe("session export/import", () => {
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

  test("X4-E1: Full-session tab shows a download button when an IR is set", async ({ page }) => {
    await page.getByLabel(/import text/i).fill(JSON.stringify(initialRecords));
    await page.getByRole("button", { name: /^import$/i }).click();
    await expect(page.getByText("10").first()).toBeVisible();

    // Interpretation: header button text was tightened to just "Export".
    await page.getByRole("button", { name: /^export$/i }).click();
    await page.getByRole("tab", { name: /full session/i }).click();
    await expect(page.getByRole("button", { name: /download \.session\.json/i })).toBeEnabled();
    await expect(page.getByTestId("session-size")).toBeVisible();
  });

  test("X4-E2: importing a session bundle creates a new workspace with matching state", async ({
    page,
  }) => {
    // Build a session bundle in the page's context (avoids the actual download
    // flow which would require interception). Then drive the import-session
    // file input with the same content.
    const bundleJson = await page.evaluate(() => {
      const records = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, status: "active" }));
      return JSON.stringify({
        version: 1,
        exportedAt: 1000,
        originClientId: "test-origin",
        workspaceName: "Imported via test",
        ir: {
          kind: "object",
          fields: { id: { type: { kind: "string" } }, status: { type: { kind: "string" } } },
          additional: false,
        },
        records,
        history: [],
        identityConfig: null,
      });
    });

    // PR BB — bundle import moved into the workspace switcher.
    await page.getByRole("button", { name: /switch workspace/i }).click();
    const fileInput = page.locator('input[aria-label="Import session bundle file"]');
    await fileInput.setInputFiles({
      name: "schemagen.session.json",
      mimeType: "application/json",
      buffer: Buffer.from(bundleJson),
    });

    // The workspace is replaced; record count shows 5 in the schema panel subtitle.
    await expect(page.getByText(/inferred from 5 records/i)).toBeVisible();
  });
});
