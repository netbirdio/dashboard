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

// Matrix-driven tests for the node-interaction matrix: every connect, drop and
// menu case gets an explicit expectation, negatives a strict no-op.

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
  page.getByTestId("create-policy-title");

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
    // Prime the API-token cache up front: its first read navigates to
    // /team/users, taking a mid-test listGroups() off the canvas.
    await listGroups(page);
    await resetDraftState(page);
    await enterDraft(page);
  });

  const MODAL_PAIRS: [Kind, Kind][] = [
    ["group", "group"],
    ["peer", "group"],
    ["group", "peer"],
    ["peer", "peer"],
    ["peer", "resource"],
    ["group", "resource"],
    ["resource", "group"],
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
      await connectNodes(
        page,
        a,
        b,
        source === "resource" || source === "network" ? "sl" : "sr",
      );
      await expectPolicyModalThenDismiss(page);
      await expect(canvasNode(page, "policy-new-")).toHaveCount(0);
      const changes = await readDraftChanges(page);
      expect(changes.filter((c) => c.type === "create-policy")).toHaveLength(0);
    });
  }

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
      await connectNodes(
        page,
        a,
        b,
        source === "resource" || source === "network" ? "sl" : "sr",
      );
      await expect(createPolicyHeading(page)).not.toBeVisible();
      expect(await edgeCount(page)).toBe(edgesBefore);
    });
  }

  test("Connect policy → policy is a no-op", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "new-policy", { fx: 0.45, fy: 0.35 });
    await createViaCanvasMenu(page, "new-policy", { fx: 0.75, fy: 0.65 });
    const policies = canvasNode(page, "policy-new-");
    await expect(policies).toHaveCount(2);
    await connectNodes(page, policies.nth(0), policies.nth(1));
    await expect(createPolicyHeading(page)).not.toBeVisible();
    expect(await edgeCount(page)).toBe(0);
  });

  test("Blank policy completes via direct connects and enters the changeset", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "new-policy", { fx: 0.6, fy: 0.5 });
    const policy = canvasNode(page, "policy-new-");
    await expect(policy).toHaveCount(1);
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
    await expectChangeCount(page, 3);
    const changes = await readDraftChanges(page);
    expect(changes.filter((c) => c.type === "create-policy")).toHaveLength(1);
  });

  test("Connecting the same group to the same policy side twice is a no-op", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "new-policy", { fx: 0.6, fy: 0.5 });
    const policy = canvasNode(page, "policy-new-");
    const g1 = await place(page, "group", 0.35, 0.5);
    await connectNodes(page, g1, policy, "sr");
    expect(await edgeCount(page)).toBe(1);
    await connectNodes(page, g1, policy, "sr");
    expect(await edgeCount(page)).toBe(1);
  });

  test("A policy referencing a no-network resource is tracked but blocked by the resource", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "new-policy", { fx: 0.6, fy: 0.35 });
    const policy = canvasNode(page, "policy-new-");
    const group = await place(page, "group", 0.35, 0.5);
    const resource = await place(page, "resource", 0.85, 0.65);

    await connectNodes(page, group, policy, "sr");
    await connectNodes(page, resource, policy, "sl");

    // The resource, not the policy, blocks: it has an address but no network.
    await expectChangeCount(page, 3);
    const changes = await readDraftChanges(page);
    expect(changes.filter((c) => c.type === "create-policy")).toHaveLength(1);
    const resourceChanges = changes.filter((c) => c.type === "create-resource");
    expect(resourceChanges).toHaveLength(1);
    expect(
      resourceChanges[0].networkId ?? resourceChanges[0].networkClientId,
    ).toBeFalsy();
  });

  test("Connect network → policy opens the destination picker", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "new-policy", { fx: 0.35, fy: 0.5 });
    const network = await place(page, "network", 0.75, 0.5);
    await connectNodes(page, network, canvasNode(page, "policy-new-"), "sl");
    // An empty network opens the picker in its no-resources state.
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

  test("Canvas context menu offers all creation entries", async ({
    dashboardAsOwner: page,
  }) => {
    const point = await panePoint(page, 0.6, 0.5);
    await page.mouse.click(point.x, point.y, { button: "right" });
    const menu = page.getByTestId("cc-canvas-context-menu");
    await expect(menu).toBeVisible();
    for (const action of [
      "new-server",
      "new-agent",
      "new-policy",
      "new-group",
      "new-network",
      "new-resource",
    ]) {
      await expect(menu.getByTestId(`cc-canvas-menu-${action}`)).toBeVisible();
    }
    await page.keyboard.press("Escape");
  });

  test("New Group via canvas menu tracks immediately; New Policy does not", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "new-group", { fx: 0.4, fy: 0.4 });
    await expect(canvasNode(page, "group-new-")).toHaveCount(1);
    await expectChangeCount(page, 1);

    await createViaCanvasMenu(page, "new-policy", { fx: 0.7, fy: 0.6 });
    await expect(canvasNode(page, "policy-new-")).toHaveCount(1);
    // Incomplete policies never enter the changeset.
    await expectChangeCount(page, 1);
  });

  test("A no-network draft resource drops into a group and shows No Network in Details", async ({
    dashboardAsOwner: page,
  }) => {
    const group = await place(page, "group", 0.45, 0.35);
    const resource = await place(page, "resource", 0.75, 0.65);
    await dragNodeOnto(page, resource, group);
    await expect(canvasNode(page, "resource-new-")).toHaveCount(0);
    await expect(group).toContainText(/1\s*resource/i);

    await clickContextMenuItem(page, group, "view-details");
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
    await expect(canvasNode(page, "group-new-")).toHaveCount(2);
    await expectChangeCount(page, 2);
  });

  test("Placeholder peer rename follows into its install-peer entry", async ({
    dashboardAsOwner: page,
  }) => {
    const peer = await place(page, "peer", 0.6, 0.5);
    await expectChangeCount(page, 1);
    await clickContextMenuItem(page, peer, "rename");
    await page.getByTestId("cc-rename-input").fill("build-server-1");
    await page.getByTestId("cc-rename-submit").click();
    await expect(peer).toContainText("build-server-1");
    await expectChangeCount(page, 1);
    const changes = await readDraftChanges(page);
    const install = changes.find((c) => c.type === "install-peer");
    expect(install.name).toBe("build-server-1");

    // Removing the placeholder resolves the pending step.
    await clickContextMenuItem(page, peer, "remove");
    await expectChangeCount(page, 0);
  });

  test('The "All" group offers no Rename or Delete', async ({
    dashboardAsOwner: page,
  }) => {
    const groups = await listGroups(page);
    const all = groups.find((g) => g.name === "All");
    expect(all).toBeTruthy();

    await dragTemplateToCanvas(page, `cc-panel-group-${all!.id}`, undefined, {
      search: "All",
    });
    const node = page.locator(`.react-flow__node[data-id="group-${all!.id}"]`);
    await expect(node).toHaveCount(1);

    await node.click({ button: "right" });
    const menu = page.getByTestId("cc-node-context-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId("cc-menu-remove")).toBeVisible();
    await expect(menu.getByTestId("cc-menu-rename")).toHaveCount(0);
    await expect(menu.getByTestId("cc-menu-delete")).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("A new draft group offers Remove but not Delete", async ({
    dashboardAsOwner: page,
  }) => {
    const group = await place(page, "group", 0.6, 0.5);
    await group.click({ button: "right" });
    const menu = page.getByTestId("cc-node-context-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId("cc-menu-remove")).toBeVisible();
    await expect(menu.getByTestId("cc-menu-rename")).toBeVisible();
    // Delete is only offered for entities that exist in the API.
    await expect(menu.getByTestId("cc-menu-delete")).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("Removing an existing group is canvas-only (no API delete tracked)", async ({
    dashboardAsOwner: page,
  }) => {
    const groups = await listGroups(page);
    const all = groups.find((g) => g.name === "All");
    expect(all).toBeTruthy();
    await dragTemplateToCanvas(page, `cc-panel-group-${all!.id}`, undefined, {
      search: "All",
    });
    const node = page.locator(`.react-flow__node[data-id="group-${all!.id}"]`);
    await expect(node).toHaveCount(1);

    await clickContextMenuItem(page, node, "remove");
    await expect(page.getByTestId("confirmation.confirm")).not.toBeVisible();
    await expect(node).toHaveCount(0);
    // No connected policies were touched → nothing to deploy.
    await expectChangeCount(page, 0);
    const after = await listGroups(page);
    expect(after.some((g) => g.id === all!.id)).toBe(true);
  });

  test("Backspace acts as Remove: draft group leaves canvas and cancels its create", async ({
    dashboardAsOwner: page,
  }) => {
    const group = await place(page, "group", 0.6, 0.5);
    await expectChangeCount(page, 1);
    // React Flow ignores delete keys while an input is focused, and the panel's
    // search takes focus on click, so blur it before pressing Backspace.
    await group.click();
    await expect(group).toHaveClass(/selected/);
    await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.blur(),
    );
    await page.keyboard.press("Backspace");
    await expect(canvasNode(page, "group-new-")).toHaveCount(0);
    await expectChangeCount(page, 0);
  });

  test('Renaming a group to "All" or a duplicate name is blocked', async ({
    dashboardAsOwner: page,
  }) => {
    const g1 = await place(page, "group", 0.45, 0.35);
    await place(page, "group", 0.75, 0.65);
    const secondName = await canvasNode(page, "group-new-").nth(1).innerText();

    await clickContextMenuItem(page, g1, "rename");
    const input = page.getByTestId("cc-rename-input");
    // Reserved system name.
    await input.fill("All");
    await expect(page.getByTestId("cc-rename-submit")).toBeDisabled();
    await input.fill(secondName.split("\n")[0].trim());
    await expect(page.getByTestId("cc-rename-submit")).toBeDisabled();
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
    await page.mouse.move(peerBox.x + 60, peerBox.y + 60, { steps: 4 });
    await page.mouse.move(
      groupBox.x + groupBox.width / 2,
      groupBox.y + groupBox.height / 2,
      { steps: 10 },
    );
    await expect(group.locator(".cc-group-node")).toHaveClass(/ring-2/);

    await page.mouse.up();
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

    await dragTemplateToCanvas(page, `cc-panel-group-${all!.id}`, undefined, {
      search: "All",
    });
    const allNode = page.locator(
      `.react-flow__node[data-id="group-${all!.id}"]`,
    );
    await expect(allNode).toHaveCount(1);

    // The peer stays on canvas; the placeholder itself tracks one install step.
    const peer = await place(page, "peer", 0.75, 0.65);
    await dragNodeOnto(page, peer, allNode);
    await expect(
      page.locator('.react-flow__node[data-id^="peer-draft-"]'),
    ).toHaveCount(1);
    await expectChangeCount(page, 1);

    // Every peer is implicitly in All once installed, so All's count bumps too.
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
    // Focus is only offered with 2+ policies (isFocusWorthy).
    const peer = await place(page, "peer", 0.6, 0.8);
    await connectNodes(page, peer, g2);
    await submitCreatePolicyModal(page);

    await g1.click();
    await expect(page.locator(".cc-dimmed")).toHaveCount(0);
    await page.keyboard.press("Escape");

    await clickContextMenuItem(page, g1, "focus");
    await expect(page.locator(".react-flow__node.cc-dimmed")).not.toHaveCount(
      0,
    );
    await page.keyboard.press("Escape");
  });

  test("Groups added while editing a policy join their side's column", async ({
    dashboardAsOwner: page,
  }) => {
    // The added groups must land in the existing columns without Auto Arrange.
    const g1 = await place(page, "group", 0.4, 0.4);
    const g2 = await place(page, "group", 0.8, 0.4);
    await connectNodes(page, g1, g2);
    await submitCreatePolicyModal(page);
    const policy = canvasNode(page, "policy-new-");
    await expect(policy).toHaveCount(1);

    await clickContextMenuItem(page, policy, "edit");
    const modalTitle = page.getByTestId("update-policy-title");
    for (const side of ["source", "destination"] as const) {
      const selector = page.getByTestId(`${side}-group-selector`);
      const search = page.getByTestId(`${side}-group-selector-search`);
      // A still-closing Radix popover can swallow the trigger click.
      await expect(async () => {
        await selector.click();
        await expect(search).toBeVisible({ timeout: 1000 });
      }).toPass();
      await search.fill(`cc-col-${side}`);
      await page.keyboard.press("Enter");
      // Escape would close the whole modal once the popover is already gone.
      await modalTitle.click();
      await expect(search).toBeHidden();
    }
    await page.getByTestId("submit-policy").click();

    await expect(canvasNode(page, "group-new-")).toHaveCount(4);

    const g1Name = (await g1.innerText()).split("\n")[0].trim();
    const g2Name = (await g2.innerText()).split("\n")[0].trim();
    for (const [anchorName, added, otherName] of [
      [g1Name, "cc-col-source", g2Name],
      [g2Name, "cc-col-destination", g1Name],
    ] as const) {
      // Layout reconciles after save, so poll until the group has settled.
      await expect
        .poll(async () => {
          const canvas = await readDraftCanvas(page);
          const posOf = (name: string) =>
            canvas.nodes.find((n: any) => n.data?.group?.name === name)
              ?.position;
          const anchor = posOf(anchorName);
          const joined = posOf(added);
          const other = posOf(otherName);
          if (!anchor || !joined || !other) return false;
          return (
            Math.abs(joined.x - anchor.x) < Math.abs(joined.x - other.x) &&
            joined.y > anchor.y
          );
        })
        .toBe(true);
    }
  });

  test("Review warns about placeholder-peer policies and unassigned resources", async ({
    dashboardAsOwner: page,
  }) => {
    const group = await place(page, "group", 0.35, 0.35);
    const peer = await place(page, "peer", 0.75, 0.35);
    await place(page, "resource", 0.55, 0.7);
    await connectNodes(page, group, peer);
    await expect(createPolicyHeading(page)).toBeVisible();
    await page.getByTestId("policy-continue").click();
    await page.getByTestId("policy-continue").click();
    await page.getByTestId("submit-policy").click();

    // Only the group is deployable; Review must still explain the rest.
    await page.getByTestId("cc-draft-review").click();
    await expect(
      page.getByRole("heading", { name: "Review & Deploy" }),
    ).toBeVisible();
    await expect(page.getByTestId("cc-peer-install")).toBeVisible();
    await expect(
      page.getByTestId("cc-change-create-resource").getByText("No Network"),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("Removing a tracked policy's only source drops its pending change", async ({
    dashboardAsOwner: page,
  }) => {
    await createViaCanvasMenu(page, "new-policy", { fx: 0.6, fy: 0.5 });
    const policy = canvasNode(page, "policy-new-");
    const g1 = await place(page, "group", 0.35, 0.5);
    const g2 = await place(page, "group", 0.85, 0.5);
    await connectNodes(page, g1, policy, "sr");
    await connectNodes(page, g2, policy, "sl");
    await expectChangeCount(page, 3);

    await clickContextMenuItem(page, g1, "remove");
    await expect(canvasNode(page, "group-new-")).toHaveCount(1);
    const changes = await readDraftChanges(page);
    expect(changes.filter((c) => c.type === "create-policy")).toHaveLength(0);
    await expectChangeCount(page, 1); // only the remaining group
  });
});
