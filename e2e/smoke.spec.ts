import { test, expect } from "@playwright/test";

/**
 * Smoke paths that do not need a signed-in account.
 * Client-edit and admin review flows stay skipped until BASE_URL points at a
 * project with test users (see task.md B9).
 */
test.describe("public smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).or(page.locator("form")).first()).toBeVisible();
  });

  test("unknown path does not crash", async ({ page }) => {
    const res = await page.goto("/this-route-should-not-exist-xyz");
    expect(res?.status()).toBeLessThan(500);
  });
});

test.describe("Track B client flow (needs test project)", () => {
  test.skip(!process.env.E2E_CLIENT_EMAIL, "Set E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD to run");

  test("client can open /my after sign-in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_CLIENT_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_CLIENT_PASSWORD || "");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(my|dashboard)/, { timeout: 30_000 });
  });
});
