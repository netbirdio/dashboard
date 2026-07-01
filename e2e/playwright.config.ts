import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, "playwright.env.json");
const env = fs.existsSync(envPath)
  ? JSON.parse(fs.readFileSync(envPath, "utf-8"))
  : {};

export default defineConfig({
  outputDir: "./test-results",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { outputFolder: "./playwright-report", open: "never" }],
        ["json", { outputFile: "test-results/results.json" }],
      ]
    : [
        ["list"],
        ["html", { outputFolder: "./playwright-report", open: "on-failure" }],
      ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: env.BASE_URL || "http://localhost:1337",
    viewport: { width: 1920, height: 1080 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  testDir: "./tests",
  webServer: {
    command: "npx serve@latest out -p 1337 --no-request-logging",
    port: 1337,
    reuseExistingServer: true,
    cwd: path.resolve(__dirname, ".."),
  },
  projects: [
    {
      name: "login",
      testMatch: "login.spec.ts",
    },
    {
      name: "e2e",
      testIgnore: "login.spec.ts",
      dependencies: ["login"],
    },
  ],
});
