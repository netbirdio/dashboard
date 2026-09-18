/**
 * ESLint flat config.
 *
 * Replaces `.eslintrc.json`, which ESLint 9 no longer reads by default, and
 * `next lint`, which Next 16 removed. `eslint-config-next` v16 already exports
 * flat config arrays, so this is a direct translation of the old eslintrc rather
 * than a FlatCompat shim.
 */
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".claude/**",
      "out/**",
      "build/**",
      "public/**",
      "playwright-report/**",
      "test-logs/**",
      "next-env.d.ts",
    ],
  },

  ...nextCoreWebVitals,

  // Must come after the Next config so it can switch off stylistic rules that
  // would otherwise fight Prettier.
  prettier,

  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "simple-import-sort/imports": [
        "warn",
        { groups: [["^\\u0000", "^@?\\w", "^[^.]", "^\\."]] },
      ],
      "simple-import-sort/exports": "warn",
    },
  },
];

export default config;
