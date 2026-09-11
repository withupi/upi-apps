import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Build and release scripts run in Node, not in the package's runtime.
    files: ["scripts/**", "*.config.ts", "*.config.js"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly" },
    },
  },
);
