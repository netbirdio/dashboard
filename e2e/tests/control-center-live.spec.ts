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
  resetDraftState,
  switchFlowView,
} from "../helpers/control-center";

/** Opens a node's live context menu and returns the menu locator (no click). */
async function openNodeMenu(page: Page, node: Locator) {
  await dismissBlockingOverlays(page);
  await node.click({ button: "right" });
  const menu = page.getByTestId("cc-node-context-menu");
  await expect(menu).toBeVisible();
  return menu;
}

/**
 * Control Center LIVE mode. The test environment has no real peers, so these
 * cover the peer-independent live surface: mode/view switching and the
 * networks view (networks render as frames whether or not they have peers or
 * resources). Live actions hit the account immediately — the opposite of the
 * draft changeset — which is exactly what the network CRUD tests assert.
 *
 * Networks-view frames also let us exercise the new NetworkActionsMenu (the ⋮
 * that replaced the standalone edit button) and the live node context menu.
 */
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

  /**
   * Seeds a bidirectional policy between two fresh groups and opens the live
   * Group view. In the clean test account the seeded group is the only one
   * with a policy, so the view auto-selects it and its policy node renders.
   * Returns the policy + group ids and the policy node locator.
   */
  async function seedPolicyAndOpenGroupView(page: Page, enabled = true) {
    // Start from a clean slate: the group view auto-selects a group that HAS a
    // policy, so leaving prior tests' policies around makes which group (and
    // thus which policy node) renders non-deterministic. With exactly one
    // PREFIX policy, the view deterministically lands on our group.
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);

    const src = await createGroup(page, generateRandomName(PREFIX));
    const dst = await createGroup(page, generateRandomName(PREFIX));
    const policyName = generateRandomName(PREFIX);
    const policy = await createPolicy(page, policyName, src.id, dst.id, enabled);

    await openControlCenter(page, "groups");
    const policyNode = canvasNode(page, `policy-${policy.id}`);
    await expect(policyNode).toBeVisible({ timeout: 15_000 });
    return { src, dst, policy, policyNode };
  }

  test("Should default to live mode with the flow selector and no draft toolbar", async ({
    dashboardAsOwner: page,
  }) => {
    await openControlCenter(page);

    // Live is the active mode; the draft toolbar is absent.
    await expect(page.getByTestId("cc-mode-live")).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible();

    // The live-only flow selector is present.
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

    // Selecting the network (drilling into the frame) reveals the header ⋮.
    await dismissBlockingOverlays(page);
    await frame.click({ force: true });
    const actions = page.getByRole("button", { name: "Network actions" });
    await expect(actions).toBeVisible();
    await actions.click();
    await page.getByRole("menuitem", { name: "Edit" }).click();

    // The live edit modal is the real network modal — saving PUTs immediately.
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

    // The account really reflects the rename (live, no deploy step).
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

    // Live delete is immediate (a real DELETE), behind a confirmation.
    await clickContextMenuItem(page, frame, "Delete");
    await page.getByTestId("confirmation.confirm").click();

    // Gone from the account and from the canvas.
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

    // Live network frame menu: Add Resource · Add Routing Peer · Delete
    // (no draft-only "Edit"/"Add Resource Group" here).
    const menu = await openNodeMenu(page, frame);
    await expect(
      menu.getByRole("button", { name: "Add Resource", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("button", { name: "Add Routing Peer", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("button", { name: "Delete", exact: true }),
    ).toBeVisible();
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

    // Drill into the network so its resources render as their own nodes.
    await dismissBlockingOverlays(page);
    await frame.click({ force: true });
    const resNode = canvasNode(page, `resource-${resource.id}`);
    await expect(resNode).toBeVisible({ timeout: 15_000 });

    // Live resource menu: Edit + Disable (enabled), and NO Delete in live.
    const menu = await openNodeMenu(page, resNode);
    await expect(
      menu.getByRole("button", { name: "Edit", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("button", { name: "Disable", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("button", { name: "Delete", exact: true }),
    ).toHaveCount(0);
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

    // Drill into the network so the resource renders as its own node.
    await dismissBlockingOverlays(page);
    await frame.click({ force: true });
    const resNode = canvasNode(page, `resource-${resource.id}`);
    await expect(resNode).toBeVisible({ timeout: 15_000 });

    // Edit via the resource menu, behind the live-mode confirmation.
    const menu = await openNodeMenu(page, resNode);
    await menu.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();

    // The modal must OPEN. It used to crash on render ("assignedPolicies is
    // not a function") because it wasn't wrapped in the NetworkProvider that
    // supplies it.
    await expect(page.getByTestId("resource-name-input")).toBeVisible();

    // Change the address and save → immediate PUT.
    await page.getByTestId("resource-address-input").fill("10.0.0.9/32");
    const putResponse = page.waitForResponse(
      (resp) =>
        new RegExp(
          `/api/networks/${network.id}/resources/${resource.id}$`,
        ).test(resp.url()) && resp.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await page.getByTestId("submit-route").click();
    // The group has no policy → the "No Access Control Policies" confirm gates
    // the PUT (scope to that dialog so a stale confirm can't shadow it).
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

    // Add a resource straight from the frame's right-click menu. This is a live
    // POST against the real network (draft mode would only touch the changeset).
    await clickContextMenuItem(page, frame, "Add Resource");
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
    // No groups picked → a "No Access Control Policies" confirmation always
    // gates the POST here. Scope to THAT dialog (a stale confirm dialog from a
    // prior step can otherwise shadow the testid).
    const noPolicyDialog = page
      .getByRole("dialog")
      .filter({ hasText: "No Access Control Policies" });
    await expect(noPolicyDialog).toBeVisible();
    await noPolicyDialog.getByTestId("confirmation.confirm").click();
    const response = await postResponse;
    expect([200, 201]).toContain(response.status());
    const created = (await response.json()) as { id: string };

    // The regression: the new resource must appear on the canvas immediately,
    // as the frame's child row, WITHOUT drilling in and back out to force a
    // rebuild (the live view init is gated on layoutInitialized).
    await expect(canvasNode(page, `resource-${created.id}`)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Should show live policy actions and warn before saving an edit", async ({
    dashboardAsOwner: page,
  }) => {
    const { policyNode } = await seedPolicyAndOpenGroupView(page);

    // Live policy menu: Edit · Disable (enabled) · Delete.
    const menu = await openNodeMenu(page, policyNode);
    await expect(
      menu.getByRole("button", { name: "Edit", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("button", { name: "Disable", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("button", { name: "Delete", exact: true }),
    ).toBeVisible();

    // Edit opens the policy modal directly (on the Policy tab); the "you are in
    // live mode" confirmation is deferred to Save (a live edit hits the account
    // at once).
    const modalTitle = page.getByRole("heading", {
      name: "Update Access Control Policy",
    });
    await menu.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(modalTitle).toBeVisible();

    // Saving warns first; cancelling the warning aborts the save (no PUT) and
    // leaves the modal open.
    await page.getByRole("button", { name: "Save Changes" }).click();
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

    // Left-clicking a policy opens the editor directly (live and draft alike);
    // the live-mode warning is deferred to Save, since the save PUTs to the
    // account immediately.
    const modalTitle = page.getByRole("heading", {
      name: "Update Access Control Policy",
    });
    await dismissBlockingOverlays(page);
    await policyNode.click();
    await expect(modalTitle).toBeVisible();

    // Saving warns first; cancelling the warning aborts the save (no PUT).
    await page.getByRole("button", { name: "Save Changes" }).click();
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
    await menu.getByRole("button", { name: "Disable", exact: true }).click();
    // Live toggle confirms first.
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();

    const response = await putResponse;
    expect([200, 201]).toContain(response.status());

    // The policy is really disabled on the account.
    await expect
      .poll(async () => {
        const policies = await listPolicies(page);
        return (policies.find((p) => p.id === policy.id) as { enabled?: boolean })
          ?.enabled;
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
    await menu.getByRole("button", { name: "Delete", exact: true }).click();
    // Live delete confirms with an "cannot be undone" danger dialog.
    await expect(page.getByText(/cannot be undone/i)).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();

    const response = await delResponse;
    expect([200, 204]).toContain(response.status());

    // Gone from the account and off the canvas.
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
    const { policy, policyNode } = await seedPolicyAndOpenGroupView(page, false);

    const menu = await openNodeMenu(page, policyNode);
    const putResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/policies/${policy.id}`) &&
        resp.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await menu.getByRole("button", { name: "Enable", exact: true }).click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.confirm").click();
    const response = await putResponse;
    expect([200, 201]).toContain(response.status());

    // The policy is really enabled on the account.
    await expect
      .poll(async () => {
        const policies = await listPolicies(page);
        return (policies.find((p) => p.id === policy.id) as { enabled?: boolean })
          ?.enabled;
      })
      .toBe(true);
  });

  test("Should arm and disarm focus mode with the F key", async ({
    dashboardAsOwner: page,
  }) => {
    await openControlCenter(page);
    const pill = page.getByText("Select a node to focus");
    await expect(pill).not.toBeVisible();

    // "F" arms focus mode (input-aware, no modifiers).
    await page.locator("body").press("f");
    await expect(pill).toBeVisible();

    // "F" again disarms it.
    await page.locator("body").press("f");
    await expect(pill).not.toBeVisible();
  });

  test("Should open a group's details panel and warn before renaming", async ({
    dashboardAsOwner: page,
  }) => {
    const { dst } = await seedPolicyAndOpenGroupView(page);
    const groupNode = canvasNode(page, `group-${dst.id}`);
    await expect(groupNode).toBeVisible();

    // Rename first (a transient confirmation dialog, unlike the panel below).
    // Rename is a live action → "live mode" confirmation; cancel it.
    let menu = await openNodeMenu(page, groupNode);
    await menu.getByRole("button", { name: "Rename", exact: true }).click();
    await expect(page.getByText("You are in live mode")).toBeVisible();
    await page.getByTestId("confirmation.cancel").click();
    await expect(page.getByTestId("confirmation.cancel")).not.toBeVisible();

    // View Details opens the group panel (same as a left-click). Done last —
    // the panel overlays the canvas and would block further node interactions.
    menu = await openNodeMenu(page, groupNode);
    await menu.getByRole("button", { name: "View Details", exact: true }).click();
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
    await menu.getByRole("button", { name: "Rename", exact: true }).click();
    // Live rename confirms first, then opens the rename modal.
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

    // The account reflects the rename.
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
    // Clean slate so the group view deterministically lands on our group (it
    // auto-selects a group that HAS a policy; see seedPolicyAndOpenGroupView).
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);

    // A group shown in the group view + an (unassigned) resource to add to it.
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

    await openControlCenter(page, "groups");
    const groupNode = canvasNode(page, `group-${dst.id}`);
    await expect(groupNode).toBeVisible({ timeout: 15_000 });

    // Open the group's side panel and switch to its Resources tab.
    await dismissBlockingOverlays(page);
    await groupNode.click();
    const panel = page.locator("#cc-group-panel");
    await expect(panel).toBeVisible();
    await panel.getByRole("tab", { name: "Resources" }).click();

    // Toggle the resource on (clicking the row flips its checkbox).
    await panel.getByText(base + "-r").click();

    // Save → the PUT must SUCCEED. The regression sent resources as bare id
    // strings, which the API rejected with 400 "could not parse json"; the fix
    // sends them as {id, type} objects like the networks/groups pages.
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

    // The resource really landed in the group on the account.
    await expect
      .poll(async () => {
        const groups = await listGroups(page);
        const g = groups.find((x) => x.id === dst.id);
        return (g?.resources ?? []).some((r: any) =>
          (typeof r === "string" ? r : r?.id) === resource.id,
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

    // Shrink the window. The panel must re-fit against the new canvas size
    // (the open-time placement effect only runs on open, so without the resize
    // listener the box would stay sized for the old, wider viewport).
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
    // Focus/Highlight is only offered when it declutters: isFocusWorthy needs
    // 2+ policy nodes on the canvas. Seed ONE source group feeding TWO
    // policies so the group view (which auto-selects the sole source group)
    // renders both policy nodes.
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);
    const src = await createGroup(page, generateRandomName(PREFIX));
    const d1 = await createGroup(page, generateRandomName(PREFIX));
    const d2 = await createGroup(page, generateRandomName(PREFIX));
    const p1 = await createPolicy(page, generateRandomName(PREFIX), src.id, d1.id);
    await createPolicy(page, generateRandomName(PREFIX), src.id, d2.id);

    await openControlCenter(page, "groups");
    const policyNode = canvasNode(page, `policy-${p1.id}`);
    await expect(policyNode).toBeVisible({ timeout: 15_000 });
    // Both policies rendered → the graph is focus-worthy.
    await expect(page.locator('.react-flow__node[data-id^="policy-"]')).toHaveCount(
      2,
    );

    // "Focus" enters focus mode.
    const menu = await openNodeMenu(page, policyNode);
    await menu.getByRole("button", { name: "Focus", exact: true }).click();

    // The focus pill names the active mode; off-path nodes dim (cc-dimmed).
    await expect(page.getByText(/Focusing on/i)).toBeVisible();
    await expect(page.locator(".cc-dimmed").first()).toBeVisible();

    // Exit via the pill's close button; the dim clears.
    await page.getByRole("button", { name: "Exit Focus" }).click();
    await expect(page.getByText(/Focusing on/i)).not.toBeVisible();
    await expect(page.locator(".cc-dimmed")).toHaveCount(0);
  });
});
