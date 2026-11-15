import { test, expect, type Page } from "@playwright/test";

/**
 * Admin mobile view at phone sizes (390x844 and 360x740, set in playwright.config.ts).
 * The login page is always checked; admin pages need E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
 */
const noSidewaysScroll = async (page: Page) => {
  const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  expect(scroll).toBeLessThanOrEqual(inner);
};

test("login page fits the phone screen", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("form")).toBeVisible();
  await noSidewaysScroll(page);
});

test.describe("admin pages (needs an admin test account)", () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_ADMIN_PASSWORD || "");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(dashboard|invitations)/, { timeout: 30_000 });
  });

  for (const path of ["/dashboard", "/invitations", "/reviews", "/templates", "/create"]) {
    test(`${path} has no sideways scrolling`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await noSidewaysScroll(page);
    });
  }

  test("a card opens its bottom sheet, which closes with the back button", async ({ page }) => {
    await page.goto("/invitations");
    const card = page.locator("tbody tr").first();
    test.skip(!(await card.count()), "No invitations in this project");
    await card.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(/\/invitations/);
  });

  test("the notification bell opens a panel that fits the screen", async ({ page }) => {
    await page.getByRole("button", { name: /^Notifications/ }).click();
    const panel = page.locator(".notif-panel");
    await expect(panel).toBeVisible();
    const box = (await panel.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
  });
});
