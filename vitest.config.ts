import { defineConfig } from "vitest/config";

// Unit tests only — e2e lives in e2e/ and runs through Playwright (npm test).
export default defineConfig({
  resolve: {
    // Honors the "@/…" / "@components/…" aliases from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // Legacy standalone test scripts (hand-rolled, call process.exit) — run
    // them directly with node/tsx instead.
    exclude: ["src/utils/ip.test.ts", "src/utils/version.test.ts"],
  },
});
