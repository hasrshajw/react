import { defineConfig, devices } from "@playwright/test";

/**
 * Track B / B9: browser e2e skeleton.
 * Install: npm i -D @playwright/test && npx playwright install chromium
 * Run against a deployed preview or local `npm run dev`:
 *   BASE_URL=https://your-preview.vercel.app npx playwright test
 * Full client-edit flows need a Supabase test project with seed accounts.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    /* Desktop runs everything except the phone-only specs. */
    { name: "chromium", testIgnore: /\.phone\.spec\.ts$/, use: { ...devices["Desktop Chrome"] } },
    /* Phone sizes for the admin mobile view (docs/RELEASE_CHECKLIST.md section 6): only e2e/*.phone.spec.ts. */
    { name: "phone-390x844", testMatch: /\.phone\.spec\.ts$/, use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
    { name: "phone-360x740", testMatch: /\.phone\.spec\.ts$/, use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
  ],
});
