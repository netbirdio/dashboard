import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteGroupsByPrefix, deleteSetupKeysByPrefix } from "../helpers/api";

let setupKeys: string[] = [];
let setupKeysCreatedGroups: string[] = [];

test.describe.serial("Setup Keys @setup-keys", () => {
  test("Should create a simple setup key", async ({ dashboardAsOwner: page }) => {
    // Clean up leftovers from previous runs
    await deleteSetupKeysByPrefix(page, "setup-key");
    await deleteGroupsByPrefix(page, "sk-group-");
    await navigateTo(page, "/setup-keys");
    const name = generateRandomName("setup-key");
    await createSetupKey(page, { name });
    setupKeys.push(name);
  });

  test("Should create a reusable setup key", async ({ dashboardAsOwner: page }) => {
    const name = generateRandomName("setup-key");
    await createSetupKey(page, { name, reusable: true });
    setupKeys.push(name);
  });

  test("Should create a setup key with all options", async ({ dashboardAsOwner: page }) => {
    const group1 = generateRandomName("sk-group-");
    const group2 = generateRandomName("sk-group-");
    setupKeysCreatedGroups.push(group1, group2);

    const name = generateRandomName("setup-key");
    await createSetupKey(page, {
      name,
      reusable: true,
      usageLimit: "100",
      expiration: "365",
      ephemeral: true,
      groups: [group1, group2],
    });
    setupKeys.push(name);
  });

  test("Should revoke setup keys", async ({ dashboardAsOwner: page }) => {
    for (const name of setupKeys) {
      await revokeSetupKey(page, name);
    }
  });

  test("Should delete setup keys", async ({ dashboardAsOwner: page }) => {
    for (const name of setupKeys) {
      await deleteSetupKey(page, name);
    }
  });

  test("Should delete created groups", async ({ dashboardAsOwner: page }) => {
    for (const prefix of setupKeysCreatedGroups) {
      await deleteGroupsByPrefix(page, prefix);
    }
    setupKeysCreatedGroups = [];
  });
});

async function createSetupKey(
  page: import("@playwright/test").Page,
  opts: {
    name: string;
    reusable?: boolean;
    usageLimit?: string;
    expiration?: string;
    ephemeral?: boolean;
    groups?: string[];
  },
) {
  await page.getByTestId("open-create-setup-key").click();
  await page.getByTestId("setup-key-name").fill(opts.name);

  if (opts.reusable) {
    await page.getByText("Make this key reusable").click();
    if (opts.usageLimit) {
      await page.getByTestId("setup-key-usage-limit").fill(opts.usageLimit);
    }
  }

  if (opts.expiration) {
    await page.getByTestId("setup-key-expire-in-days").fill(opts.expiration);
  }

  if (opts.ephemeral) {
    await page.getByText("Ephemeral Peers").click();
  }

  if (opts.groups && opts.groups.length > 0) {
    await page.getByTestId("group-selector-dropdown").click();
    for (const group of opts.groups) {
      const search = page.getByTestId("group-selector-dropdown-search");
      await expect(search).toBeVisible();
      await search.fill(group);
      await search.press("Enter");
    }
    await page.getByTestId("group-selector-dropdown-search").press("Escape");
    await expect(
      page.getByTestId("group-selector-dropdown-search"),
    ).not.toBeVisible();
  }

  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/setup-keys") && resp.request().method() === "GET",
  );
  await page.getByTestId("create-setup-key").click();

  const copyInput = page.getByTestId("setup-key-copy-input");
  const keyValue = await copyInput.getAttribute("data-testid-setup-key-value");
  expect(keyValue!.length).toBeGreaterThan(10);
  await page.getByTestId("setup-key-close").click();

  await expect(copyInput).not.toBeVisible();
  await responsePromise;
  await expect(page.getByText(opts.name)).toBeVisible();
}

async function revokeSetupKey(
  page: import("@playwright/test").Page,
  name: string,
) {
  // Row actions are now behind a dropdown menu.
  await page
    .locator("tr")
    .filter({ hasText: name })
    .getByTestId("setup-key-actions")
    .click({ force: true });
  await page
    .locator('[data-testid="revoke-setup-key"]:not([data-disabled])')
    .click({ force: true });
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/setup-keys/") && resp.request().method() === "PUT",
    { timeout: 10_000 },
  );
  await page.getByTestId("confirmation.confirm").click();
  await responsePromise;
  await expect(
    page
      .locator("tr")
      .filter({ hasText: name })
      .getByTestId("circle-icon-inactive"),
  ).toBeVisible();
}

async function deleteSetupKey(
  page: import("@playwright/test").Page,
  name: string,
) {
  // Row actions are now behind a dropdown menu.
  await page
    .locator("tr")
    .filter({ hasText: name })
    .getByTestId("setup-key-actions")
    .click({ force: true });
  await page.getByTestId("delete-setup-key").click({ force: true });
  await page.getByTestId("confirmation.confirm").click();
  await expect(page.locator("tr").filter({ hasText: name })).not.toBeVisible();
}
