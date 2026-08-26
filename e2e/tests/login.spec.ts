import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { waitForProxyClustersOnline } from "../helpers/api";
import { loginToApp } from "../helpers/auth";

type TestUser = "owner" | "user";

const AUTH_DIR = path.resolve(__dirname, "../fixtures/auth");

const credentials: Record<TestUser, { username: string; password: string }> = {
  owner: { username: "owner@localhost.test", password: "testMe123@" },
  user: { username: "user@localhost.test", password: "testMe123@" },
};

async function loginAndSave(
  page: import("@playwright/test").Page,
  user: TestUser,
) {
  const { username, password } = credentials[user];

  await page.goto("/");

  await page.locator("input[id=loginName]").waitFor({ state: "visible" });
  await page.locator("input[id=loginName]").fill(username);
  await page.locator("button[id=submit-button]").click();
  await page.locator("input[id=password]").waitFor({ state: "visible" });
  await page.locator("input[id=password]").fill(password);
  await page.locator("button[id=submit-button]").click();

  // After submitting credentials, we land on either:
  // - 2FA skip prompt, or
  // - the app directly (redirect to localhost:1337)
  const skipButton = page.locator("button[name=skip]");
  const appNav = page.getByTestId("left-navigation-item").first();
  const modal = page.getByTestId("setup-netbird-modal");
  const approval = page.getByText("User Approval Pending");

  const after_login = await Promise.race([
    skipButton.waitFor({ timeout: 15_000 }).then(() => "2fa" as const),
    appNav.waitFor({ timeout: 15_000 }).then(() => "app" as const),
    modal.waitFor({ timeout: 15_000 }).then(() => "modal" as const),
    approval.waitFor({ timeout: 15_000 }).then(() => "approval" as const),
  ]);

  if (after_login === "2fa") {
    await skipButton.click();
    await Promise.race([
      appNav.waitFor({ timeout: 15_000 }),
      modal.waitFor({ timeout: 15_000 }),
      approval.waitFor({ timeout: 15_000 }),
    ]);
  }

  // Dismiss setup modal if present
  if (await modal.isVisible().catch(() => false)) {
    await modal.getByTestId("modal-close").click();
  }

  await page
    .context()
    .storageState({ path: path.join(AUTH_DIR, `${user}.json`) });
}

test.describe("Global Setup", () => {
  for (const user of ["owner", "user"] as TestUser[]) {
    test(`authenticate ${user}`, async ({ page }) => {
      const authFile = path.join(AUTH_DIR, `${user}.json`);
      test.skip(fs.existsSync(authFile), `${user} auth file already exists`);
      await loginAndSave(page, user);
    });
  }

  // Wait for the test reverse-proxy clusters to be registered and online
  // before the rest of the suite runs. They come up asynchronously after
  // test:setup, so without this the reverse-proxy specs flake when the
  // domain picker is still empty.
  //
  // This deliberately does NOT fail the run if the clusters never appear:
  // it only adds a bounded wait so slow registration is absorbed. A hard
  // gate would skip the entire suite on any cluster hiccup, which is worse
  // than letting the individual reverse-proxy specs report the problem.
  test("wait for reverse-proxy clusters to be online", async ({ browser }) => {
    test.setTimeout(15_000);
    const context = await browser.newContext({
      storageState: path.join(AUTH_DIR, "owner.json"),
    });
    const page = await context.newPage();
    try {
      // storageState only carries the Zitadel session cookies — the app
      // still needs the OIDC redirect flow to get an access token before
      // it makes any API call, so log in like every other consumer does.
      await loginToApp(page, "owner");
      await waitForProxyClustersOnline(page, [
        "example.com",
        "noports.example.com",
      ]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[setup] proxy clusters not confirmed online; reverse-proxy specs may be affected: ${
          (err as Error).message
        }`,
      );
    } finally {
      await context.close();
    }
  });
});
