import { defineConfig } from "vitest/config";

// Unit tests (task M-14). `npm test` runs them once. A test file that needs a DOM starts with `// @vitest-environment jsdom`.
export default defineConfig({
  test: { include: ["src/**/*.test.{ts,tsx}"], environment: "node" },
});
