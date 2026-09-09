import { expect, Locator, Page } from "@playwright/test";
import { test } from "../helpers/fixtures";
import {
  createGroup,
  createNetwork,
  createPolicy,
  createResource,
  deleteGroupsByPrefix,
  deleteNetworksByPrefix,
  deletePoliciesBySubstring,
  listGroups,
  listNetworks,
  listPolicies,
} from "../helpers/api";
import { generateRandomName } from "../helpers/utils";
import {
  canvasNode,
  clickContextMenuItem,
  dismissBlockingOverlays,
  openControlCenter,
  openGroupView,
  resetDraftState,
  switchFlowView,
} from "../helpers/control-center";

async function openNodeMenu(page: Page, node: Locator) {
  await dismissBlockingOverlays(page);
  await node.click({ button: "right" });
  const menu = page.getByTestId("cc-node-context-menu");
  await expect(menu).toBeVisible();
  return menu;
}

// The test environment has no real peers, so these cover the peer-independent
// live surface: mode/view switching and the networks view.
test.describe.serial("Control Center Live Mode @control-center", () => {
  const PREFIX = "cc-live-";

  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test.afterAll(async ({ dashboardAsOwner: page }) => {
    // Policies must go before groups (a group in use can't be deleted).
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteNetworksByPrefix(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);
  });

  async function seedPolicyAndOpenGroupView(page: Page, enabled = true) {
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);

    const src = await createGroup(page, generateRandomName(PREFIX));
    const dst = await createGroup(page, generateRandomName(PREFIX));
    const policyName = generateRandomName(PREFIX);
    const policy = await createPolicy(
      page,
      policyName,
      src.id,
      dst.id,
      enabled,
    );

    const policyNode = canvasNode(page, `policy-${policy.id}`);
    // Selecting src by name rather than trusting the view's own pick: the
    // auto-select ranks every group in the account, so a peer-bearing group
    // another spec seeded on the other worker outranks this one.
    await openGroupView(page, src.name);
    await expect(policyNode).toBeVisible({ timeout: 10_000 });
    return { src, dst, policy, policyNode };
  }

  test("Should default to live mode with the flow selector and no draft toolbar", async ({
    dashboardAsOwner: page,
  }) => {
    await openControlCenter(page);

    await expect(page.getByTestId("cc-mode-live")).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible();

    await expect(page.getByTestId("cc-flow-networks")).toBeVisible();
    await expect(page.getByTestId("cc-flow-peers")).toBeVisible();
  });

  test("Should switch between flow views", async ({
    dashboardAsOwner: page,
  }) => {
    await openControlCenter(page);

    for (const view of ["users", "groups", "networks", "peers"] as const) {
      await switchFlowView(page, view);
    }
  });

  test("Should render a seeded network as a frame in the networks view", async ({
    dashboardAsOwner: page,
  }) => {
    const name = generateRandomName(PREFIX);
    const network = await createNetwork(page, name);

    await openControlCenter(page, "networks");

    const frame = canvasNode(page, `network-${network.id}`);
    await expect(frame).toBeVisible();
    await expect(frame).toContainText(name);
  });

  test("Should live-edit a network via the ⋮ actions menu (immediate PUT)", async ({
    dashboardAsOwner: page,
  }) => {
    const name = generateRandomName(PREFIX);
    const renamed = generateRandomName(PREFIX);
    const network = await createNetwork(page, name);

    await openControlCenter(page, "networks");
    const frame = canvasNode(page, `network-${network.id}`);
    await expect(frame).toBeVisible();

    await dismissBlockingOverlays(page);
    await frame.click({ force: true });
    const actions = page.getByRole("button", { name: "Network actions" });
    await expect(actions).toBeVisible();
    await actions.click();
    await page.getByRole("menuitem", { name: "Edit" }).click();

    const nameInput = page.getByTestId("network-name-input");
    await expect(nameInput).toBeVisible();
    await nameInput.fill(renamed);

    const putResponse = page.waitForResponse(
      (resp) =>
        /\/api\/networks\/[^/]+$/.test(resp.url()) &&
        resp.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await page.getByTestId("submit-network").click({ force: true });
    const response = await putResponse;
    expect([200, 201]).toContain(response.status());

    await expect
      .poll(async () => {
        const nets = await listNetworks(page);
        return nets.find((n) => n.id === network.id)?.name;
      })
      .toBe(renamed);
  });

  test("Should delete a network from the account via the frame's right-click menu", async ({
    dashboardAsOwner: page,
  }) => {
    const name = generateRandomName(PREFIX);
    const network = await createNetwork(page, name);

    await openControlCenter(page, "networks");
    const frame = canvasNode(page, `network-${network.id}`);
    await expect(frame).toBeVisible();

    await clickContextMenuItem(page, frame, "delete");
    await page.getByTestId("confirmation.confirm").click();

    await expect
      .poll(async () => {
        const nets = await listNetworks(page);
        return nets.some((n) => n.id === network.id);
      })
      .toBe(false);
    await expect(frame).not.toBeVisible();
  });

  test("Should offer live network frame actions on the right-click menu", async ({
    dashboardAsOwner: page,
  }) => {
    const name = generateRandomName(PREFIX);
    const network = await createNetwork(page, name);

    await openControlCenter(page, "networks");
    const frame = canvasNode(page, `network-${network.id}`);
    await expect(frame).toBeVisible();

    const menu = await openNodeMenu(page, frame);
    await expect(menu.getByTestId("cc-menu-add-resource")).toBeVisible();
    await expect(menu.getByTestId("cc-menu-add-routing-peer")).toBeVisible();
    await expect(menu.getByTestId("cc-menu-delete")).toBeVisible();
  });

  test("Should show live resource actions inside a drilled network", async ({
    dashboardAsOwner: page,
  }) => {
    const base = generateRandomName(PREFIX);
    const group = await createGroup(page, base + "-g");
    const network = await createNetwork(page, base + "-n");
    const resource = await createResource(
      page,
      network.id,
      base + "-r",
      "10.0.0.5/32",
      [group.id],
    );

    await openControlCenter(page, "networks");
    const frame = canvasNode(page, `network-${network.id}`);
    await expect(frame).toBeVisible();

    await dismissBlockingOverlays(page);
    await frame.click({ force: true });
    const resNode = canvasNode(page, `resource-${resource.id}`);
    await expect(resNode).toBeVisible({ timeout: 15_000 });

    const menu = await openNodeMenu(page, resNode);
    await expect(menu.getByTestId("cc-menu-edit")).toBeVisible();
    await expect(menu.getByTestId("cc-menu-disable")).toBeVisible();
    await expect(menu.getByTestId("cc-menu-delete")).toHaveCount(0);
  });

  test("Should edit a live resource inside a drilled network (modal opens, PUT)", async ({
    dashboardAsOwner: page,
  }) => {
    const base = generateRandomName(PREFIX);
    const group = await createGroup(page, base + "-g");
    const network = await createNetwork(page, base + "-n");
    const resource = await createResource(
      page,
      network.id,
      base + "-r",
      "10.0.0.5/32",
      [group.id],
    );

    await openControlCenter(page, "networks");
    const frame = canvasNode(page, `network-${network.id}`);
    await expect(frame).toBeVisible();

    await dismissBlockingOverlays(page);
    await frame.click({ force: true });
    const resNode = canvasNode(page, `resource-${resource.id}`);
    await expect(resNode).toBeVisible({ timeout: 15_000 });

    const menu = await openNodeMenu(page, resNode);
    await menu.getByTestId("cc-menu-edit").click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();

    // The modal crashes on render unless it is wrapped in a NetworkProvider.
    await expect(page.getByTestId("resource-name-input")).toBeVisible();

    await page.getByTestId("resource-address-input").fill("10.0.0.9/32");
    const putResponse = page.waitForResponse(
      (resp) =>
        new RegExp(
          `/api/networks/${network.id}/resources/${resource.id}$`,
        ).test(resp.url()) && resp.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await page.getByTestId("submit-route").click();
    // The group has no policy, so this confirm gates the PUT; scope it so a
    // stale confirm can't shadow the testid.
    const noPolicyDialog = page
      .getByRole("dialog")
      .filter({ hasText: "No Access Control Policies" });
    await expect(noPolicyDialog).toBeVisible();
    await noPolicyDialog.getByTestId("confirmation.confirm").click();
    const response = await putResponse;
    expect([200, 201]).toContain(response.status());
  });

  test("Should show a live-added resource on the canvas without navigating", async ({
    dashboardAsOwner: page,
  }) => {
    const base = generateRandomName(PREFIX);
    const network = await createNetwork(page, base + "-n");

    await openControlCenter(page, "networks");
    const frame = canvasNode(page, `network-${network.id}`);
    await expect(frame).toBeVisible();

    await clickContextMenuItem(page, frame, "add-resource");
    await page.getByTestId("resource-name-input").fill(base + "-r");
    await page.getByTestId("resource-address-input").fill("10.0.0.9/32");
    await page.getByTestId("resource-continue").click();

    const postResponse = page.waitForResponse(
      (resp) =>
        /\/api\/networks\/[^/]+\/resources$/.test(resp.url()) &&
        resp.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByTestId("submit-resource").click();
    // No groups picked, so this confirm gates the POST; scope it so a stale
    // confirm can't shadow the testid.
    const noPolicyDialog = page
      .getByRole("dialog")
      .filter({ hasText: "No Access Control Policies" });
    await expect(noPolicyDialog).toBeVisible();
    await noPolicyDialog.getByTestId("confirmation.confirm").click();
    const response = await postResponse;
    expect([200, 201]).toContain(response.status());
    const created = (await response.json()) as { id: string };

    // The node must appear without drilling in and out to force a rebuild.
    await expect(canvasNode(page, `resource-${created.id}`)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Should show live policy actions and warn before saving an edit", async ({
    dashboardAsOwner: page,
  }) => {
    const { policyNode } = await seedPolicyAndOpenGroupView(page);

    const menu = await openNodeMenu(page, policyNode);
    await expect(menu.getByTestId("cc-menu-edit")).toBeVisible();
    await expect(menu.getByTestId("cc-menu-disable")).toBeVisible();
    await expect(menu.getByTestId("cc-menu-delete")).toBeVisible();

    const modalTitle = page.getByTestId("update-policy-title");
    await menu.getByTestId("cc-menu-edit").click();
    await expect(modalTitle).toBeVisible();

    await page.getByTestId("submit-policy").click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.cancel").click();
    await expect(modalTitle).toBeVisible();

    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(modalTitle).not.toBeVisible();
  });

  test("Should warn before saving a policy opened on left-click in live mode", async ({
    dashboardAsOwner: page,
  }) => {
    const { policyNode } = await seedPolicyAndOpenGroupView(page);

    const modalTitle = page.getByTestId("update-policy-title");
    await dismissBlockingOverlays(page);
    await policyNode.click();
    await expect(modalTitle).toBeVisible();

    await page.getByTestId("submit-policy").click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.cancel").click();
    await expect(modalTitle).toBeVisible();

    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(modalTitle).not.toBeVisible();
  });

  test("Should disable a policy from the live menu (immediate PUT)", async ({
    dashboardAsOwner: page,
  }) => {
    const { policy, policyNode } = await seedPolicyAndOpenGroupView(page);

    const menu = await openNodeMenu(page, policyNode);
    const putResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/policies/${policy.id}`) &&
        resp.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await menu.getByTestId("cc-menu-disable").click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();

    const response = await putResponse;
    expect([200, 201]).toContain(response.status());

    await expect
      .poll(async () => {
        const policies = await listPolicies(page);
        return (
          policies.find((p) => p.id === policy.id) as { enabled?: boolean }
        )?.enabled;
      })
      .toBe(false);
  });

  test("Should delete a policy from the live menu (immediate DELETE)", async ({
    dashboardAsOwner: page,
  }) => {
    const { policy, policyNode } = await seedPolicyAndOpenGroupView(page);

    const menu = await openNodeMenu(page, policyNode);
    const delResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/policies/${policy.id}`) &&
        resp.request().method() === "DELETE",
      { timeout: 30_000 },
    );
    await menu.getByTestId("cc-menu-delete").click();
    await expect(page.getByText(/cannot be undone/i)).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();

    const response = await delResponse;
    expect([200, 204]).toContain(response.status());

    await expect
      .poll(async () => {
        const policies = await listPolicies(page);
        return policies.some((p) => p.id === policy.id);
      })
      .toBe(false);
    await expect(policyNode).not.toBeVisible();
  });

  test("Should enable a disabled policy from the live menu (immediate PUT)", async ({
    dashboardAsOwner: page,
  }) => {
    // Seed a DISABLED policy so its live menu offers "Enable".
    const { policy, policyNode } = await seedPolicyAndOpenGroupView(
      page,
      false,
    );

    const menu = await openNodeMenu(page, policyNode);
    const putResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/policies/${policy.id}`) &&
        resp.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await menu.getByTestId("cc-menu-enable").click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();
    const response = await putResponse;
    expect([200, 201]).toContain(response.status());

    await expect
      .poll(async () => {
        const policies = await listPolicies(page);
        return (
          policies.find((p) => p.id === policy.id) as { enabled?: boolean }
        )?.enabled;
      })
      .toBe(true);
  });

  test("Should arm and disarm focus mode with the F key", async ({
    dashboardAsOwner: page,
  }) => {
    await openControlCenter(page);
    const pill = page.getByText("Select a node to focus");
    await expect(pill).not.toBeVisible();

    await page.locator("body").press("f");
    await expect(pill).toBeVisible();

    await page.locator("body").press("f");
    await expect(pill).not.toBeVisible();
  });

  test("Should open a group's details panel and warn before renaming", async ({
    dashboardAsOwner: page,
  }) => {
    const { dst } = await seedPolicyAndOpenGroupView(page);
    const groupNode = canvasNode(page, `group-${dst.id}`);
    await expect(groupNode).toBeVisible();

    // Rename first: its dialog is transient, unlike the panel below.
    let menu = await openNodeMenu(page, groupNode);
    await menu.getByTestId("cc-menu-rename").click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.cancel").click();
    await expect(page.getByTestId("confirmation.cancel")).not.toBeVisible();

    // Done last: the panel overlays the canvas and blocks node interactions.
    menu = await openNodeMenu(page, groupNode);
    await menu.getByTestId("cc-menu-view-details").click();
    await expect(page.locator("#cc-group-panel")).toBeVisible();
  });

  test("Should rename a group via the live menu (immediate PUT)", async ({
    dashboardAsOwner: page,
  }) => {
    const { dst } = await seedPolicyAndOpenGroupView(page);
    const groupNode = canvasNode(page, `group-${dst.id}`);
    await expect(groupNode).toBeVisible();
    const newName = generateRandomName(PREFIX);

    const menu = await openNodeMenu(page, groupNode);
    await menu.getByTestId("cc-menu-rename").click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();

    const putResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/groups/${dst.id}`) &&
        resp.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await page.getByTestId("cc-rename-input").fill(newName);
    await page.getByTestId("cc-rename-submit").click({ force: true });
    const response = await putResponse;
    expect([200, 201]).toContain(response.status());

    await expect
      .poll(async () => {
        const groups = await listGroups(page);
        return groups.find((g) => g.id === dst.id)?.name;
      })
      .toBe(newName);
  });

  test("Should save group resource membership in live mode (correct payload)", async ({
    dashboardAsOwner: page,
  }) => {
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);

    const base = generateRandomName(PREFIX);
    const src = await createGroup(page, base + "-src");
    const dst = await createGroup(page, base + "-dst");
    await createPolicy(page, base + "-p", src.id, dst.id, true);
    const network = await createNetwork(page, base + "-n");
    const resource = await createResource(
      page,
      network.id,
      base + "-r",
      "10.0.0.7/32",
      [],
    );

    await openGroupView(page, src.name);
    const groupNode = canvasNode(page, `group-${dst.id}`);
    await expect(groupNode).toBeVisible({ timeout: 15_000 });

    await dismissBlockingOverlays(page);
    await groupNode.click();
    const panel = page.locator("#cc-group-panel");
    await expect(panel).toBeVisible();
    await panel.getByRole("tab", { name: "Resources" }).click();

    await panel.getByText(base + "-r").click();

    // The API rejects resources sent as bare id strings instead of {id, type}.
    const putResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/groups/${dst.id}`) &&
        resp.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await panel.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();
    const response = await putResponse;
    expect([200, 201]).toContain(response.status());

    await expect
      .poll(async () => {
        const groups = await listGroups(page);
        const g = groups.find((x) => x.id === dst.id);
        return (g?.resources ?? []).some(
          (r: any) => (typeof r === "string" ? r : r?.id) === resource.id,
        );
      })
      .toBe(true);
  });

  test("Should keep the group panel fitted after a viewport resize", async ({
    dashboardAsOwner: page,
  }) => {
    const { dst } = await seedPolicyAndOpenGroupView(page);
    const groupNode = canvasNode(page, `group-${dst.id}`);
    await expect(groupNode).toBeVisible();

    await dismissBlockingOverlays(page);
    await groupNode.click();
    const panel = page.locator("#cc-group-panel");
    await expect(panel).toBeVisible();

    // The placement effect only runs on open, so this exercises the resize
    // listener.
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect
      .poll(async () => {
        const box = await panel.boundingBox();
        return box ? Math.round(box.x + box.width) : Number.MAX_SAFE_INTEGER;
      })
      .toBeLessThanOrEqual(1200);
    const after = await panel.boundingBox();
    expect(after!.x).toBeGreaterThan(0);

    // Restore the viewport for the tests that follow.
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("Should highlight a node's connections (focus mode) and exit", async ({
    dashboardAsOwner: page,
  }) => {
    // Focus is only offered with 2+ policy nodes, hence two policies.
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);
    const src = await createGroup(page, generateRandomName(PREFIX));
    const d1 = await createGroup(page, generateRandomName(PREFIX));
    const d2 = await createGroup(page, generateRandomName(PREFIX));
    const p1 = await createPolicy(
      page,
      generateRandomName(PREFIX),
      src.id,
      d1.id,
    );
    await createPolicy(page, generateRandomName(PREFIX), src.id, d2.id);

    await openGroupView(page, src.name);
    const policyNode = canvasNode(page, `policy-${p1.id}`);
    await expect(policyNode).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('.react-flow__node[data-id^="policy-"]'),
    ).toHaveCount(2);

    const menu = await openNodeMenu(page, policyNode);
    await menu.getByTestId("cc-menu-focus").click();

    await expect(page.getByText(/Focusing on/i)).toBeVisible();
    await expect(page.locator(".cc-dimmed").first()).toBeVisible();

    await page.getByRole("button", { name: "Exit Focus" }).click();
    await expect(page.getByText(/Focusing on/i)).not.toBeVisible();
    await expect(page.locator(".cc-dimmed")).toHaveCount(0);
  });
});
