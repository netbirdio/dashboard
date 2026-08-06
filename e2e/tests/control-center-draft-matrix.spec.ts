import { Page, expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import { listGroups } from "../helpers/api";
import {
  canvasNode,
  clickContextMenuItem,
  connectNodes,
  dragNodeOnto,
  dragTemplateToCanvas,
  enterDraft,
  expectChangeCount,
  panePoint,
  createViaCanvasMenu,
  readDraftChanges,
  readDraftCanvas,
  resetDraftState,
  submitCreatePolicyModal,
} from "../helpers/control-center";

/**
 * Matrix-driven tests for the control-center node-interaction matrix.
 * Every node-pair connect, drop, menu, and negative case gets an explicit
 * expectation — positives assert the modal/edge/changeset, negatives assert
 * a strict no-op.
 */

// Node kinds placeable from the components panel, with their canvas id prefix.
const KIND = {
  group: { template: "cc-template-group", prefix: "group-new-" },
  peer: { template: "cc-template-peer-server", prefix: "peer-draft-" },
  resource: { template: "cc-template-resource", prefix: "resource-new-" },
  network: { template: "cc-template-network", prefix: "network-new-" },
} as const;

type Kind = keyof typeof KIND;

async function place(page: Page, kind: Kind, fx: number, fy: number) {
  const before = await canvasNode(page, KIND[kind].prefix).count();
  await dragTemplateToCanvas(page, KIND[kind].template, {
    ...(await panePoint(page, fx, fy)),
  });
  // A resource drop opens the editor first; the node is created on save.
  if (kind === "resource") {
    await page.getByTestId("resource-name-input").fill(`cc-res-${before}`);
    await page
      .getByTestId("resource-address-input")
      .fill(`10.99.${before}.1/32`);
    await page.getByTestId("submit-resource").click({ force: true });
  }
  const nodes = canvasNode(page, KIND[kind].prefix);
  await expect(nodes).toHaveCount(before + 1);
  return nodes.nth(before);
}

const createPolicyHeading = (page: Page) =>
  page.getByRole("heading", { name: "Create New Access Control Policy" });

async function expectPolicyModalThenDismiss(page: Page) {
  await expect(createPolicyHeading(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(createPolicyHeading(page)).not.toBeVisible();
}

async function edgeCount(page: Page) {
  return page.locator(".react-flow__edge").count();
}

test.describe.serial("Control Center Draft Matrix @control-center", () => {
  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
    await enterDraft(page);
  });

  // ── Connect matrix: pairs that OPEN the create-policy modal ──────────────

  const MODAL_PAIRS: [Kind, Kind][] = [
    ["group", "group"],
    ["peer", "group"],
    ["group", "peer"],
    ["peer", "peer"],
    ["peer", "resource"],
    ["group", "resource"],
    // resource as drag-source flips roles but still opens the modal
    ["resource", "group"],
    // toward a network frame the modal opens with a scoped destination
    ["group", "network"],
    ["peer", "network"],
  ];

  for (const [source, target] of MODAL_PAIRS) {
    test(`Connect ${source} → ${target} opens the create-policy modal`, async ({
      dashboardAsOwner: page,
    }) => {
      const a = await place(page, source, 0.45, 0.35);
      const b = await place(page, target, 0.75, 0.65);
      // Resources only expose a left (destination) handle.
      await connectNodes(page, a, b, source === "resource" || source === "network" ? "sl" : "sr");
      await expectPolicyModalThenDismiss(page);
      // Dismissing the modal must not leave a policy or edge behind.
      await expect(canvasNode(page, "policy-new-")).toHaveCount(0);
      const changes = await readDraftChanges(page);
      expect(changes.filter((c) => c.type === "create-policy")).toHaveLength(0);
    });
  }

  // ── Connect matrix: strict no-op pairs ────────────────────────────────────

  const NOOP_PAIRS: [Kind, Kind][] = [
    ["resource", "resource"],
    ["network", "group"],
    ["network", "peer"],
  ];

  for (const [source, target] of NOOP_PAIRS) {
    test(`Connect ${source} → ${target} is a no-op`, async ({
      dashboardAsOwner: page,
    }) => {
      const a = await place(page, source, 0.45, 0.35);
      const b = await place(page, target, 0.75, 0.65);
      const edgesBefore = await edgeCount(page);
      await connectNodes(page, a, b, source === "resource" || source === "network" ? "sl" : "sr");
      await expect(createPolicyHeading(page)).not.toBeVisible();
      expect(await edgeCount(page)).toBe(edgesBefore);
    });
  }

  test("Connect policy → policy is a no-op", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "New Policy", { fx: 0.45, fy: 0.35 });
    await createViaCanvasMenu(page, "New Policy", { fx: 0.75, fy: 0.65 });
    const policies = canvasNode(page, "policy-new-");
    await expect(policies).toHaveCount(2);
    await connectNodes(page, policies.nth(0), policies.nth(1));
    await expect(createPolicyHeading(page)).not.toBeVisible();
    expect(await edgeCount(page)).toBe(0);
  });

  // ── Direct connects onto an existing blank policy (no modal) ─────────────

  test("Blank policy completes via direct connects and enters the changeset", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "New Policy", { fx: 0.6, fy: 0.5 });
    const policy = canvasNode(page, "policy-new-");
    await expect(policy).toHaveCount(1);
    // A blank (incomplete) policy is canvas-only.
    const g1 = await place(page, "group", 0.35, 0.5);
    const g2 = await place(page, "group", 0.85, 0.5);
    await expectChangeCount(page, 2); // just the two groups

    // Right handle → source side; left handle → destination side.
    await connectNodes(page, g1, policy, "sr");
    await expect(createPolicyHeading(page)).not.toBeVisible();
    expect(await edgeCount(page)).toBe(1);
    await expectChangeCount(page, 2); // still incomplete: one side only

    await connectNodes(page, g2, policy, "sl");
    expect(await edgeCount(page)).toBe(2);
    // Both sides set → the create-policy change appears without any modal.
    await expectChangeCount(page, 3);
    const changes = await readDraftChanges(page);
    expect(changes.filter((c) => c.type === "create-policy")).toHaveLength(1);
  });

  test("Connecting the same group to the same policy side twice is a no-op", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "New Policy", { fx: 0.6, fy: 0.5 });
    const policy = canvasNode(page, "policy-new-");
    const g1 = await place(page, "group", 0.35, 0.5);
    await connectNodes(page, g1, policy, "sr");
    expect(await edgeCount(page)).toBe(1);
    // Same group, same side again → duplicate guard.
    await connectNodes(page, g1, policy, "sr");
    expect(await edgeCount(page)).toBe(1);
  });

  test("A policy referencing a no-network resource is tracked but blocked by the resource", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "New Policy", { fx: 0.6, fy: 0.35 });
    const policy = canvasNode(page, "policy-new-");
    const group = await place(page, "group", 0.35, 0.5);
    const resource = await place(page, "resource", 0.85, 0.65);

    await connectNodes(page, group, policy, "sr");
    await connectNodes(page, resource, policy, "sl");

    // The policy is a complete change (both sides set, the resource tracked).
    // What blocks the deploy is the resource itself: it has an address but no
    // network, so its create-resource change carries the "No Network" issue.
    await expectChangeCount(page, 3);
    const changes = await readDraftChanges(page);
    expect(changes.filter((c) => c.type === "create-policy")).toHaveLength(1);
    const resourceChanges = changes.filter((c) => c.type === "create-resource");
    expect(resourceChanges).toHaveLength(1);
    expect(
      resourceChanges[0].networkId ?? resourceChanges[0].networkClientId,
    ).toBeFalsy();
  });

  // ── Network flows ─────────────────────────────────────────────────────────

  test("Connect network → policy opens the destination picker", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "New Policy", { fx: 0.35, fy: 0.5 });
    const network = await place(page, "network", 0.75, 0.5);
    await connectNodes(page, network, canvasNode(page, "policy-new-"), "sl");
    // The empty network opens the picker in its no-resources state, so assert
    // the "Select Destination" modal rather than the resource selector.
    await expect(
      page.getByRole("heading", { name: "Select Destination" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("Connect resource → network reparents the resource into the frame", async ({
    dashboardAsOwner: page,
  }) => {
    const resource = await place(page, "resource", 0.35, 0.5);
    const network = await place(page, "network", 0.75, 0.5);
    await connectNodes(page, resource, network, "sl");
    // No policy modal — the resource joins the frame.
    await expect(createPolicyHeading(page)).not.toBeVisible();
    await expect
      .poll(async () => {
        const canvas = await readDraftCanvas(page);
        const node = canvas?.nodes?.find((n: any) =>
          n.id.startsWith("resource-new-"),
        );
        return node?.parentId ?? null;
      })
      .toMatch(/^network-new-/);
  });

  // ── Canvas context-menu creation ──────────────────────────────────────────

  test("Canvas context menu offers all creation entries", async ({
    dashboardAsOwner: page,
  }) => {
    const point = await panePoint(page, 0.6, 0.5);
    await page.mouse.click(point.x, point.y, { button: "right" });
    const menu = page.getByTestId("cc-canvas-context-menu");
    await expect(menu).toBeVisible();
    for (const label of [
      "New Server",
      "New Agent",
      "New Policy",
      "New Group",
      "New Network",
      "New Resource",
    ]) {
      await expect(menu.getByRole("button", { name: label })).toBeVisible();
    }
    await page.keyboard.press("Escape");
  });

  test("New Group via canvas menu tracks immediately; New Policy does not", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "New Group", { fx: 0.4, fy: 0.4 });
    await expect(canvasNode(page, "group-new-")).toHaveCount(1);
    await expectChangeCount(page, 1);

    await createViaCanvasMenu(page, "New Policy", { fx: 0.7, fy: 0.6 });
    await expect(canvasNode(page, "policy-new-")).toHaveCount(1);
    // Incomplete policies never enter the changeset.
    await expectChangeCount(page, 1);
  });

  // ── Drop-into matrix ──────────────────────────────────────────────────────

  test("A no-network draft resource drops into a group and shows No Network in Details", async ({
    dashboardAsOwner: page,
  }) => {
    const group = await place(page, "group", 0.45, 0.35);
    const resource = await place(page, "resource", 0.75, 0.65);
    await dragNodeOnto(page, resource, group);
    // The resource is absorbed as a member even without a network.
    await expect(canvasNode(page, "resource-new-")).toHaveCount(0);
    await expect(group).toContainText(/1\s*resource/i);

    // Its Details row carries the "No Network" alert.
    await clickContextMenuItem(page, group, "View Details");
    await page.getByRole("tab", { name: /Resources/ }).click();
    await expect(page.getByText("No network")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("A group dragged onto another group just repositions", async ({
    dashboardAsOwner: page,
  }) => {
    const g1 = await place(page, "group", 0.45, 0.35);
    const g2 = await place(page, "group", 0.75, 0.65);
    await dragNodeOnto(page, g1, g2);
    // Groups aren't droppable into groups — both remain.
    await expect(canvasNode(page, "group-new-")).toHaveCount(2);
    await expectChangeCount(page, 2);
  });

  // ── Context menus, rename, remove/delete semantics ────────────────────────

  test("Placeholder peer rename follows into its install-peer entry", async ({
    dashboardAsOwner: page,
  }) => {
    const peer = await place(page, "peer", 0.6, 0.5);
    // Placing a placeholder tracks exactly one pending install step.
    await expectChangeCount(page, 1);
    await clickContextMenuItem(page, peer, "Rename");
    await page.getByTestId("cc-rename-input").fill("build-server-1");
    await page.getByTestId("cc-rename-submit").click();
    await expect(peer).toContainText("build-server-1");
    // Renaming updates the entry in place — no extra change.
    await expectChangeCount(page, 1);
    const changes = await readDraftChanges(page);
    const install = changes.find((c) => c.type === "install-peer");
    expect(install.name).toBe("build-server-1");

    // Removing the placeholder resolves the pending step.
    await clickContextMenuItem(page, peer, "Remove");
    await expectChangeCount(page, 0);
  });

  test('The "All" group offers no Rename or Delete', async ({
    dashboardAsOwner: page,
  }) => {
    const groups = await listGroups(page);
    const all = groups.find((g) => g.name === "All");
    expect(all).toBeTruthy();

    await page.getByTestId("cc-toolbar-add").click();
    await page.getByPlaceholder(/Search components/).fill("All");
    await dragTemplateToCanvas(page, `cc-panel-group-${all!.id}`);
    const node = page.locator(
      `.react-flow__node[data-id="group-${all!.id}"]`,
    );
    await expect(node).toHaveCount(1);

    await node.click({ button: "right" });
    const menu = page.getByTestId("cc-node-context-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: "Remove" })).toBeVisible();
    await expect(menu.getByRole("button", { name: "Rename" })).toHaveCount(0);
    await expect(menu.getByRole("button", { name: "Delete" })).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("A new draft group offers Remove but not Delete", async ({
    dashboardAsOwner: page,
  }) => {
    const group = await place(page, "group", 0.6, 0.5);
    await group.click({ button: "right" });
    const menu = page.getByTestId("cc-node-context-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: "Remove" })).toBeVisible();
    await expect(menu.getByRole("button", { name: "Rename" })).toBeVisible();
    // Delete is reserved for entities that exist in the API.
    await expect(menu.getByRole("button", { name: "Delete" })).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("Removing an existing group is canvas-only (no API delete tracked)", async ({
    dashboardAsOwner: page,
  }) => {
    const groups = await listGroups(page);
    const all = groups.find((g) => g.name === "All");
    expect(all).toBeTruthy();
    await page.getByTestId("cc-toolbar-add").click();
    await page.getByPlaceholder(/Search components/).fill("All");
    await dragTemplateToCanvas(page, `cc-panel-group-${all!.id}`);
    const node = page.locator(
      `.react-flow__node[data-id="group-${all!.id}"]`,
    );
    await expect(node).toHaveCount(1);

    await clickContextMenuItem(page, node, "Remove");
    await expect(page.getByTestId("confirmation.confirm")).not.toBeVisible();
    await expect(node).toHaveCount(0);
    // No connected policies were touched → nothing to deploy.
    await expectChangeCount(page, 0);
    // The group still exists in the account.
    const after = await listGroups(page);
    expect(after.some((g) => g.id === all!.id)).toBe(true);
  });

  test("Backspace acts as Remove: draft group leaves canvas and cancels its create", async ({
    dashboardAsOwner: page,
  }) => {
    const group = await place(page, "group", 0.6, 0.5);
    await expectChangeCount(page, 1);
    await group.click();
    await page.keyboard.press("Escape"); // close the group panel, keep selection
    await page.keyboard.press("Backspace");
    // Keyboard removal routes through the same Remove semantics as the
    // context menu: node gone AND the pending create-group cancelled.
    await expect(canvasNode(page, "group-new-")).toHaveCount(0);
    await expectChangeCount(page, 0);
  });

  test('Renaming a group to "All" or a duplicate name is blocked', async ({
    dashboardAsOwner: page,
  }) => {
    const g1 = await place(page, "group", 0.45, 0.35);
    await place(page, "group", 0.75, 0.65);
    const secondName = await canvasNode(page, "group-new-")
      .nth(1)
      .innerText();

    await clickContextMenuItem(page, g1, "Rename");
    const input = page.getByTestId("cc-rename-input");
    // Reserved system name.
    await input.fill("All");
    await expect(page.getByTestId("cc-rename-submit")).toBeDisabled();
    // Duplicate of another draft group on the canvas.
    await input.fill(secondName.split("\n")[0].trim());
    await expect(page.getByTestId("cc-rename-submit")).toBeDisabled();
    // A unique name is accepted.
    await input.fill("unique-name-ok");
    await expect(page.getByTestId("cc-rename-submit")).toBeEnabled();
    await page.keyboard.press("Escape");
  });

  test("Hovering a group mid-drag shows the solid drop ring; drop records membership", async ({
    dashboardAsOwner: page,
  }) => {
    const group = await place(page, "group", 0.35, 0.35);
    const peer = await place(page, "peer", 0.75, 0.65);
    const peerBox = await peer.boundingBox();
    const groupBox = await group.boundingBox();
    if (!peerBox || !groupBox) throw new Error("nodes not laid out");

    await page.mouse.move(
      peerBox.x + peerBox.width / 2,
      peerBox.y + peerBox.height / 2,
    );
    await page.mouse.down();
    // Mid-drag away from the group: eligible groups show the white border.
    await page.mouse.move(peerBox.x + 60, peerBox.y + 60, { steps: 4 });
    await expect(group.locator(".cc-group-node")).toHaveClass(
      /border-white\/60/,
    );
    // Over the group: the stronger solid drop-target ring.
    await page.mouse.move(
      groupBox.x + groupBox.width / 2,
      groupBox.y + groupBox.height / 2,
      { steps: 10 },
    );
    await expect(group.locator(".cc-group-node")).toHaveClass(/ring-2/);

    await page.mouse.up();
    // Drag treatment cleared, membership recorded.
    await expect(group.locator(".cc-group-node")).not.toHaveClass(
      /border-white/,
    );
    await expect(group).toContainText(/1\s*peer/i);
  });

  test('Dropping into "All" is rejected, but All mirrors draft peers added to other groups', async ({
    dashboardAsOwner: page,
  }) => {
    const groups = await listGroups(page);
    const all = groups.find((g) => g.name === "All");
    expect(all).toBeTruthy();
    const allPeerCount = all!.peers_count ?? 0;

    await page.getByTestId("cc-toolbar-add").click();
    await page.getByPlaceholder(/Search components/).fill("All");
    await dragTemplateToCanvas(page, `cc-panel-group-${all!.id}`);
    const allNode = page.locator(
      `.react-flow__node[data-id="group-${all!.id}"]`,
    );
    await expect(allNode).toHaveCount(1);

    // Dropping a peer onto "All" is a no-op: the peer stays on canvas.
    // (The placed placeholder itself tracks one install-peer step.)
    const peer = await place(page, "peer", 0.75, 0.65);
    await dragNodeOnto(page, peer, allNode);
    await expect(
      page.locator('.react-flow__node[data-id^="peer-draft-"]'),
    ).toHaveCount(1);
    await expectChangeCount(page, 1);

    // But adding that draft peer to a NORMAL group also bumps All's count —
    // every peer is implicitly in All once installed.
    const group = await place(page, "group", 0.35, 0.35);
    await dragNodeOnto(page, peer, group);
    await expect(group).toContainText(/1\s*peer/i);
    await expect(allNode).toContainText(
      new RegExp(`${allPeerCount + 1}\\s*peer`, "i"),
    );
  });

  test("Left-clicking a group opens its panel without focus-dimming the canvas", async ({
    dashboardAsOwner: page,
  }) => {
    // Connected nodes so a focus WOULD have something to dim.
    const g1 = await place(page, "group", 0.4, 0.4);
    const g2 = await place(page, "group", 0.8, 0.4);
    await connectNodes(page, g1, g2);
    await submitCreatePolicyModal(page);
    await place(page, "peer", 0.6, 0.8); // an off-path node that would dim

    await g1.click();
    // The group panel opens, but nothing dims — focus is context-menu only.
    await expect(page.locator(".cc-dimmed")).toHaveCount(0);
    await page.keyboard.press("Escape");

    // Focus via context menu DOES dim off-path nodes.
    await clickContextMenuItem(page, g1, "Focus");
    await expect(page.locator(".react-flow__node.cc-dimmed")).not.toHaveCount(
      0,
    );
    await page.keyboard.press("Escape");
  });

  test("Groups added while editing a policy join their side's column", async ({
    dashboardAsOwner: page,
  }) => {
    // Build a group→group policy, then edit it and add one inline group to
    // each side. The new nodes must land IN the existing columns (same x,
    // stacked below) without needing Auto Arrange.
    const g1 = await place(page, "group", 0.4, 0.4);
    const g2 = await place(page, "group", 0.8, 0.4);
    await connectNodes(page, g1, g2);
    await submitCreatePolicyModal(page);
    const policy = canvasNode(page, "policy-new-");
    await expect(policy).toHaveCount(1);

    await clickContextMenuItem(page, policy, "Edit");
    for (const side of ["source", "destination"] as const) {
      await page.getByTestId(`${side}-group-selector`).click();
      await page
        .getByTestId(`${side}-group-selector-search`)
        .fill(`cc-col-${side}`);
      await page.keyboard.press("Enter");
      await page.keyboard.press("Escape");
    }
    await page.getByTestId("submit-policy").click();

    await expect(canvasNode(page, "group-new-")).toHaveCount(4);
    const canvas = await readDraftCanvas(page);
    const groupsByName = (name: string) =>
      canvas.nodes.find((n: any) => n.data?.group?.name === name);
    const pos = (node: any) => node.position;

    for (const [existing, added] of [
      [g1, "cc-col-source"],
      [g2, "cc-col-destination"],
    ] as const) {
      const existingName = (await existing.innerText()).split("\n")[0].trim();
      const anchor = pos(groupsByName(existingName));
      const joined = pos(groupsByName(added));
      expect(joined.x).toBeCloseTo(anchor.x, 0); // same column
      expect(joined.y).toBeGreaterThan(anchor.y); // stacked below
    }
  });

  test("Review warns about placeholder-peer policies and unassigned resources", async ({
    dashboardAsOwner: page,
  }) => {
    // A "complete-looking" policy whose destination is an uninstalled peer,
    // plus a standalone resource with no network.
    const group = await place(page, "group", 0.35, 0.35);
    const peer = await place(page, "peer", 0.75, 0.35);
    await place(page, "resource", 0.55, 0.7);
    await connectNodes(page, group, peer);
    await expect(createPolicyHeading(page)).toBeVisible();
    await page.getByTestId("policy-continue").click();
    await page.getByTestId("policy-continue").click();
    await page.getByTestId("submit-policy").click();

    // Only the group is deployable — but Review must explain the rest:
    // warnings for the blocked policy/resource plus the peer's own
    // amber "Install" step row.
    await page.getByTestId("cc-draft-review").click();
    await expect(
      page.getByText(/references a peer that isn't installed yet/),
    ).toBeVisible();
    await expect(
      page.getByText(/has no network assigned and won't deploy/),
    ).toBeVisible();
    await expect(page.getByText("Install", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("Removing a tracked policy's only source drops its pending change", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "New Policy", { fx: 0.6, fy: 0.5 });
    const policy = canvasNode(page, "policy-new-");
    const g1 = await place(page, "group", 0.35, 0.5);
    const g2 = await place(page, "group", 0.85, 0.5);
    await connectNodes(page, g1, policy, "sr");
    await connectNodes(page, g2, policy, "sl");
    await expectChangeCount(page, 3);

    // Removing the source group strips it from the policy → the policy is
    // incomplete again and its pending create disappears.
    await clickContextMenuItem(page, g1, "Remove");
    await expect(canvasNode(page, "group-new-")).toHaveCount(1);
    const changes = await readDraftChanges(page);
    expect(changes.filter((c) => c.type === "create-policy")).toHaveLength(0);
    await expectChangeCount(page, 1); // only the remaining group
  });
});
