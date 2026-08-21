import { expect, Page } from "@playwright/test";
import { test } from "../helpers/fixtures";
import {
  createGroup,
  createNetwork,
  createPolicy,
  deleteGroupsByPrefix,
  deleteNetworksByPrefix,
  deletePoliciesBySubstring,
  listNetworks,
  listPolicies,
} from "../helpers/api";
import { generateRandomName } from "../helpers/utils";
import {
  canvasNode,
  clickContextMenuItem,
  connectNodes,
  createViaCanvasMenu,
  dismissBlockingOverlays,
  enterDraft,
  openControlCenter,
  resetDraftState,
  reviewButton,
} from "../helpers/control-center";

test.describe
  .serial("Control Center Draft — remove change cascade @control-center", () => {
  const PREFIX = "cc-rm-";

  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test.afterAll(async ({ dashboardAsOwner: page }) => {
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteNetworksByPrefix(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);
  });

  // Clean-slated so the draft group view's auto-select is deterministic.
  async function seedPolicyGroupView(page: Page) {
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);
    const src = await createGroup(page, generateRandomName(PREFIX));
    const dst = await createGroup(page, generateRandomName(PREFIX));
    const policy = await createPolicy(
      page,
      generateRandomName(PREFIX),
      src.id,
      dst.id,
    );
    await openControlCenter(page, "groups");
    await enterDraft(page);
    const policyNode = canvasNode(page, `policy-${policy.id}`);
    await expect(policyNode).toBeVisible({ timeout: 15_000 });
    return { policy, policyNode };
  }

  // The header button can sit under the billing-modal backdrop.
  const openReview = async (page: Page) => {
    await dismissBlockingOverlays(page);
    await reviewButton(page).click({ force: true });
    await expect(page.getByTestId("cc-deploy")).toBeVisible();
  };

  const removeChangeRow = async (page: Page, type: string) => {
    const row = page.getByTestId(`cc-change-${type}`).first();
    await expect(row).toBeVisible();
    await row.getByTestId("cc-change-menu").click();
    await page.getByTestId("cc-change-remove").click();
  };

  test("Removing a new network detaches its resource to No Network", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await createViaCanvasMenu(page, "new-network");
    const frame = canvasNode(page, "network-new-");
    await expect(frame).toHaveCount(1);

    await dismissBlockingOverlays(page);
    await frame.click({ force: true });
    await page.getByTestId("cc-add-resource").click();
    await page.getByTestId("resource-name-input").fill("detach-res");
    await page.getByTestId("resource-address-input").fill("10.7.7.7/32");
    await page.getByTestId("submit-resource").click({ force: true });
    await expect(canvasNode(page, "resource-new-")).toHaveCount(1);

    await openReview(page);
    await expect(page.getByTestId("cc-change-create-network")).toBeVisible();
    await expect(page.getByTestId("cc-change-create-resource")).toBeVisible();

    await removeChangeRow(page, "create-network");
    await expect(page.getByText(/Detaches 1 resource/i)).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();

    await expect(
      page.getByTestId("cc-change-create-network"),
    ).not.toBeVisible();
    await expect(page.getByTestId("cc-change-create-resource")).toBeVisible();
    await expect(page.getByText("No Network").first()).toBeVisible();
  });

  test("Removing a new group drops it from its policy (and the one-sided policy)", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await createViaCanvasMenu(page, "new-group", { fx: 0.3, fy: 0.4 });
    await createViaCanvasMenu(page, "new-group", { fx: 0.3, fy: 0.7 });
    const groups = canvasNode(page, "group-new-");
    await expect(groups).toHaveCount(2);
    await createViaCanvasMenu(page, "new-policy", { fx: 0.65, fy: 0.5 });
    const policy = canvasNode(page, "policy-new-");
    await connectNodes(page, groups.nth(0), policy, "sr");
    await connectNodes(page, groups.nth(1), policy, "sl");

    await openReview(page);
    await expect(page.getByTestId("cc-change-create-policy")).toBeVisible();
    await expect(page.getByTestId("cc-change-create-group")).toHaveCount(2);

    await removeChangeRow(page, "create-group");
    await expect(page.getByText(/Removes it from 1 policy/i)).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();

    await expect(page.getByTestId("cc-change-create-policy")).not.toBeVisible();
    await expect(page.getByTestId("cc-change-create-group")).toHaveCount(1);
  });

  test("Removing a delete-network change restores the network frame", async ({
    dashboardAsOwner: page,
  }) => {
    const network = await createNetwork(page, generateRandomName(PREFIX));
    await openControlCenter(page, "networks");
    await enterDraft(page);

    const frame = canvasNode(page, `network-${network.id}`);
    await expect(frame).toBeVisible();

    await clickContextMenuItem(page, frame, "delete");
    await page.getByTestId("confirmation.confirm").click();
    await expect(frame).not.toBeVisible();

    await openReview(page);
    await removeChangeRow(page, "delete-network");
    await expect(page.getByText(/Restore the network/i)).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();
    await page.keyboard.press("Escape"); // close review modal

    await expect(canvasNode(page, `network-${network.id}`)).toBeVisible();
    // The network was never actually deleted on the account.
    await expect
      .poll(async () =>
        (await listNetworks(page)).some((n) => n.id === network.id),
      )
      .toBe(true);
  });

  test("Removing an update-policy change reverts the policy to live", async ({
    dashboardAsOwner: page,
  }) => {
    const { policy, policyNode } = await seedPolicyGroupView(page);

    await clickContextMenuItem(page, policyNode, "disable");

    await openReview(page);
    await expect(page.getByTestId("cc-change-update-policy")).toBeVisible();
    await removeChangeRow(page, "update-policy");
    await expect(page.getByText(/Revert your changes/i)).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();

    await expect(page.getByTestId("cc-change-update-policy")).not.toBeVisible();
    // The live policy was never changed.
    await expect
      .poll(async () => {
        const p = (await listPolicies(page)).find(
          (x) => x.id === policy.id,
        ) as {
          enabled?: boolean;
        };
        return p?.enabled;
      })
      .toBe(true);
  });

  test("Removing a delete-policy change restores the policy", async ({
    dashboardAsOwner: page,
  }) => {
    const { policy, policyNode } = await seedPolicyGroupView(page);

    await clickContextMenuItem(page, policyNode, "delete");
    await page.getByTestId("confirmation.confirm").click();
    await expect(policyNode).not.toBeVisible();

    await openReview(page);
    await removeChangeRow(page, "delete-policy");
    await expect(page.getByText(/Restore the policy/i)).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();
    await page.keyboard.press("Escape");

    await expect(canvasNode(page, `policy-${policy.id}`)).toBeVisible();
    // Never actually deleted on the account.
    await expect
      .poll(async () =>
        (await listPolicies(page)).some((p) => p.id === policy.id),
      )
      .toBe(true);
  });
});
