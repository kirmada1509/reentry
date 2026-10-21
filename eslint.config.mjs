import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".runtime/**",
    "extension/.wxt/**",
    "extension/.output/**",
    "output/**",
    "test-results/**",
    "playwright-report/**",
    "coverage/**",
    "next-env.d.ts",
    "src/components/**",
    "src/hooks/**",
    "src/lib/utils.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}", "extension/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='createElement']",
          message: "Use installed registry UI and framework page composition.",
        },
      ],
    },
  },
]);
