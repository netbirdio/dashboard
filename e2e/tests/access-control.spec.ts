import { test, expect } from "../helpers/fixtures";
import { generateRandomName } from "../helpers/utils";
import { navigateTo } from "../helpers/auth";
import { deleteGroupsByPrefix } from "../helpers/api";

let policies: string[] = [];
let createdGroups: string[] = [];

test.describe.serial("Access Controls @access-control", () => {
  test("Should have default policy", async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/access-control");
    await expect(page.getByText("Default", { exact: true })).toBeVisible();
    await expect(page.getByText("This is a default rule")).toBeVisible();
  });

  test("Should create new policy", async ({ dashboardAsOwner: page }) => {
    const srcGroup = generateRandomName("ac-src-");
    const dstGroup = generateRandomName("ac-dst-");
    createdGroups.push(srcGroup, dstGroup);

    const name = generateRandomName("Policy ");
    await createPolicy(page, {
      name,
      source_groups: [srcGroup],
      destination_groups: [dstGroup],
      protocol: "TCP",
      ports: ["80", "443"],
      direction: "in",
      description: "This is a test policy",
    });
    policies.push(name);
  });

  test("Should delete created policies", async ({ dashboardAsOwner: page }) => {
    for (const policy of policies) {
      await deletePolicy(page, policy);
    }
    policies = [];
  });

  test("Should delete created groups", async ({ dashboardAsOwner: page }) => {
    for (const prefix of createdGroups) {
      await deleteGroupsByPrefix(page, prefix);
    }
    createdGroups = [];
  });
});

async function createPolicy(
  page: import("@playwright/test").Page,
  opts: {
    protocol?: "ALL" | "TCP" | "UDP" | "ICMP";
    source_groups: string[];
    destination_groups: string[];
    direction?: "bi" | "in";
    ports?: string[];
    name: string;
    description?: string;
  },
) {
  await page.getByTestId("open-add-policy").click();

  if (opts.protocol !== "ALL") {
    await page.getByTestId("protocol-select-button").click();
    await page
      .getByTestId("protocol-selection")
      .getByText(opts.protocol!)
      .click();
  }

  if (opts.direction === "in") {
    await page.getByTestId("policy-direction").click();
  }

  // Add source groups
  if (opts.source_groups.length > 0) {
    await page.getByTestId("source-group-selector").click();
    for (const group of opts.source_groups) {
      const search = page.getByTestId("source-group-selector-search");
      await expect(search).toBeVisible();
      await search.fill(group);
      await search.press("Enter");
    }
    await page.getByTestId("source-group-selector-search").press("Escape");
    await expect(
      page.getByTestId("source-group-selector-search"),
    ).not.toBeVisible();
  }

  // Add destination groups
  if (opts.destination_groups.length > 0) {
    await page.getByTestId("destination-group-selector").click();
    for (const group of opts.destination_groups) {
      const search = page.getByTestId("destination-group-selector-search");
      await expect(search).toBeVisible();
      await search.fill(group);
      await search.press("Enter");
    }
    await page
      .getByTestId("destination-group-selector-search")
      .press("Escape");
    await expect(
      page.getByTestId("destination-group-selector-search"),
    ).not.toBeVisible();
  }

  // Add ports
  if (
    opts.ports &&
    (opts.protocol === "TCP" || opts.protocol === "UDP")
  ) {
    await page.getByTestId("port-selector").click();
    for (const port of opts.ports) {
      const input = page.getByTestId("port-input");
      await expect(input).toBeVisible();
      await input.fill(port);
      await input.press("Enter");
    }
    await page.getByTestId("port-input").press("Escape");
  }

  // Click Continue (policy → posture checks)
  await page.getByTestId("policy-continue").click();
  // Skip posture checks and continue (posture checks → general)
  await page.getByTestId("policy-continue").click();

  // Enter name
  await page.getByTestId("policy-name").fill(opts.name);
  if (opts.description) {
    await page.getByTestId("policy-description").fill(opts.description);
  }

  // Create policy
  await page.getByTestId("submit-policy").click();
  await expect(page.getByTestId(opts.name)).toBeVisible();
}

async function deletePolicy(
  page: import("@playwright/test").Page,
  name: string,
) {
  // Row actions are now behind a dropdown menu.
  await page
    .locator("tr")
    .filter({ hasText: name })
    .getByTestId("policy-actions")
    .click({ force: true });
  await page.getByTestId("delete-policy").click({ force: true });
  await page.getByTestId("confirmation.confirm").click();
  await expect(page.getByTestId(name)).not.toBeVisible({ timeout: 10_000 });
}
