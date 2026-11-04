import { defineConfig } from "vitest/config";

// Unit tests only — e2e lives in e2e/ and runs through Playwright (npm test).
export default defineConfig({
  resolve: {
    // Honors the "@/…" / "@components/…" aliases from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    // Locale detection has its own standalone runner: npm run test:i18n.
    exclude: ["src/i18n/detection.test.ts"],
  },
});
