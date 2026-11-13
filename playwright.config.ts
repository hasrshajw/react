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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
