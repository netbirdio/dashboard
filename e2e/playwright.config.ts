import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  deployedBaseURL,
  deployedGrepInvert,
  isDeployedTarget,
} from "./helpers/target";

const ACCOUNT_SETTINGS_SPECS =
  /settings-(authentication|clients|groups|networks|permissions)\.spec\.ts$/;

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
  grepInvert: isDeployedTarget ? deployedGrepInvert() : undefined,
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
    baseURL: deployedBaseURL || env.BASE_URL || "http://localhost:1337",
    viewport: { width: 1920, height: 1080 },
    screenshot: "only-on-failure",
    // A deployed target logs in with real credentials, which traces and videos
    // record as typed input, so they must never reach an uploaded report.
    trace: isDeployedTarget ? "off" : "retain-on-failure",
    video: isDeployedTarget ? "off" : "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  testDir: "./tests",
  webServer: isDeployedTarget
    ? undefined
    : {
        command: "npx serve@latest out -p 1337 --no-request-logging",
        port: 1337,
        reuseExistingServer: true,
        cwd: path.resolve(__dirname, ".."),
      },
  projects: [
    {
      name: "login",
      testMatch: isDeployedTarget ? "deployed.setup.ts" : "login.spec.ts",
    },
    {
      name: "e2e",
      testIgnore: ["login.spec.ts", ACCOUNT_SETTINGS_SPECS],
      dependencies: ["login"],
    },
    {
      // Each settings tab saves the WHOLE account settings object from its own
      // copy, so two of these on different workers revert each other's change.
      // One worker runs them in turn while the rest of the suite stays parallel.
      name: "account-settings",
      testMatch: ACCOUNT_SETTINGS_SPECS,
      dependencies: ["login"],
      workers: 1,
    },
  ],
});
