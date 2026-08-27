import { expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import {
  createGroup,
  createNetwork,
  createResource,
  deleteGroupsByPrefix,
  deleteNetworksByPrefix,
} from "../helpers/api";
import { generateRandomName } from "../helpers/utils";
import {
  canvasNode,
  createViaCanvasMenu,
  dismissBlockingOverlays,
  enterDraft,
  openControlCenter,
  resetDraftState,
} from "../helpers/control-center";

test.describe.serial("Control Center Drill-down @control-center", () => {
  const PREFIX = "cc-drill-";

  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test.afterAll(async ({ dashboardAsOwner: page }) => {
    await deleteNetworksByPrefix(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);
  });

  test("Live: drilling into a network shows its resource, Add Resource, and back", async ({
    dashboardAsOwner: page,
  }) => {
    const base = generateRandomName(PREFIX);
    const group = await createGroup(page, base + "-g");
    const network = await createNetwork(page, base + "-n");
    const resource = await createResource(
      page,
      network.id,
      base + "-r",
      "10.0.0.9/32",
      [group.id],
    );

    await openControlCenter(page, "networks");
    const frame = canvasNode(page, `network-${network.id}`);
    await expect(frame).toBeVisible();

    await dismissBlockingOverlays(page);
    await frame.click({ force: true });

    await expect(page.getByTestId("cc-network-back")).toBeVisible();
    await expect(page.getByTestId("cc-add-resource")).toBeVisible();
    await expect(canvasNode(page, `resource-${resource.id}`)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("cc-network-back").click();
    await expect(page.getByTestId("cc-network-back")).not.toBeVisible();
    await expect(frame).toBeVisible();
  });

  test("Draft: drill into a new network and add a resource into the frame", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await createViaCanvasMenu(page, "new-network");
    const frame = canvasNode(page, "network-new-");
    await expect(frame).toHaveCount(1);

    await dismissBlockingOverlays(page);
    await frame.click({ force: true });
    await expect(page.getByTestId("cc-drill-back")).toBeVisible();
    await expect(page.getByTestId("cc-add-resource")).toBeVisible();

    await page.mouse.click(0, 0); // close any transient menu
    await page.getByTestId("cc-add-resource").click();
    await page.getByTestId("resource-name-input").fill("drill-res");
    await page.getByTestId("resource-address-input").fill("10.1.2.3/32");
    await page.getByTestId("submit-resource").click({ force: true });

    await expect(canvasNode(page, "resource-new-")).toHaveCount(1);

    await page.getByTestId("cc-drill-back").click();
    await expect(page.getByTestId("cc-drill-back")).not.toBeVisible();
  });
});
