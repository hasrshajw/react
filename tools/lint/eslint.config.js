// ESLint for ../../src (task M-14). Run from the repo root with `npm run lint` (after `npm run lint:install` once).
// Syntax-level rules only (no type-aware rules): TypeScript itself is checked by `npm run typecheck`.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist/**", "**/node_modules/**", "tools/**", "api/**", "vite.config.ts"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.browser } },
    rules: {
      // The two classic hook rules. The newer React Compiler rules in eslint-plugin-react-hooks 7 (refs, set-state-in-effect, ...)
      // are not switched on: they flag many working patterns here and are better added one at a time later.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // The codebase still uses `any` in places (task M-14, "tighten types"); warn so it shows up without failing the build.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
  {
    // Tests build fake clients and rows on purpose; typing every fake would hide the test itself.
    files: ["src/**/*.test.{ts,tsx}"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
);
