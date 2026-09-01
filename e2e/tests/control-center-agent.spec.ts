import { Page, expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import { listPeers } from "../helpers/api";
import {
  canvasNode,
  enterDraft,
  expectChangeCount,
  readDraftCanvas,
  readDraftChanges,
  resetDraftState,
} from "../helpers/control-center";

/**
 * The assistant's control-center actions, driven the way the assistant drives
 * them — through the canvas API the page publishes (`window.__controlCenterAgent` in the
 * test build), with no model in the loop. What's under test is that those
 * actions really build a draft: nodes appear, changes get tracked, connects
 * land on a policy.
 */

type Step = { ok: boolean; detail: string; nodeId?: string };

/** Calls one method on the page's canvas API and returns its result. */
async function agent<T>(page: Page, method: string, arg?: unknown): Promise<T> {
  return (await page.evaluate(
    async ([m, a]) => {
      const api = (window as unknown as { __controlCenterAgent?: Record<string, any> })
        .__controlCenterAgent;
      if (!api) throw new Error("__controlCenterAgent is not exposed — test build only");
      return await api[m as string](a);
    },
    [method, arg ?? undefined] as [string, unknown],
  )) as T;
}

const add = (page: Page, items: unknown[]) =>
  agent<Step[]>(page, "addNodes", items);

/** Whether a node's card is inside the visible canvas — the user's own test. */
async function nodeOnScreen(page: Page, nodeId: string): Promise<boolean> {
  const pane = await page.locator(".react-flow").boundingBox();
  const node = await page
    .locator(`.react-flow__node[data-id="${nodeId}"]`)
    .boundingBox();
  if (!pane || !node) return false;
  return (
    node.x >= pane.x &&
    node.y >= pane.y &&
    node.x + node.width <= pane.x + pane.width &&
    node.y + node.height <= pane.y + pane.height
  );
}

test.describe.serial("Control Center Assistant Actions @control-center", () => {
  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test("Should refuse to add anything outside a draft", async ({
    dashboardAsOwner: page,
  }) => {
    const steps = await add(page, [{ kind: "new_policy" }]);

    expect(steps[0].ok).toBe(false);
    expect(steps[0].detail).toContain("draft mode");
  });

  test("Should start an empty draft and add a server, an agent and a policy", async ({
    dashboardAsOwner: page,
  }) => {
    const started = await agent<Step>(page, "draftAction", "new_empty");
    expect(started.ok).toBe(true);
    await expect(page.getByTestId("cc-draft-cancel")).toBeVisible();

    const steps = await add(page, [
      { kind: "server", name: "agent-build-01" },
      { kind: "agent" },
      { kind: "new_policy" },
    ]);

    expect(steps.every((s) => s.ok)).toBe(true);
    await expect(canvasNode(page, "peer-draft-")).toHaveCount(2);
    await expect(canvasNode(page, "policy-new-")).toHaveCount(1);
    // Both placeholders need installing, so both are tracked; a one-sided
    // policy isn't trackable yet.
    await expectChangeCount(page, 2);

    const canvas = await readDraftCanvas(page);
    const names = (canvas?.nodes ?? []).map(
      (n: { data?: { placeholderName?: string } }) => n.data?.placeholderName,
    );
    expect(names).toContain("agent-build-01");
  });

  test("Should connect a placeholder into a policy's source side", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);

    const [server, policy] = await add(page, [
      { kind: "server", name: "agent-src-01" },
      { kind: "new_policy" },
    ]);
    expect(server.nodeId && policy.nodeId).toBeTruthy();

    const links = await agent<Step[]>(page, "connectNodes", [
      { from: server.nodeId, to: policy.nodeId },
    ]);

    expect(links[0].ok).toBe(true);
    // A connect onto a policy node is applied directly — the create-policy
    // wizard (which a node↔node connect would open) never appears.
    await expect(page.getByTestId("policy-continue")).not.toBeVisible();
    const canvas = await readDraftCanvas(page);
    expect(canvas?.nodes?.length).toBeGreaterThanOrEqual(2);
  });

  test("Should rename and then remove a node it added", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [group] = await add(page, [{ kind: "new_group" }]);
    expect(group.nodeId).toBeTruthy();

    const renamed = await agent<Step[]>(page, "editNodes", [
      { node: group.nodeId, action: "rename", name: "Agent Renamed Group" },
    ]);
    expect(renamed[0].ok).toBe(true);

    let canvas = await readDraftCanvas(page);
    const names = (canvas?.nodes ?? []).map(
      (n: { data?: { group?: { name?: string } } }) => n.data?.group?.name,
    );
    expect(names).toContain("Agent Renamed Group");

    const removed = await agent<Step[]>(page, "editNodes", [
      { node: group.nodeId, action: "remove" },
    ]);
    expect(removed[0].ok).toBe(true);
    await expect(canvasNode(page, group.nodeId!)).toHaveCount(0);
    // Removing a pending create cancels it rather than recording a delete.
    await expectChangeCount(page, 0);
  });

  test("Should name a group at birth, with exactly one create change", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);

    const [group] = await add(page, [
      { kind: "new_group", name: "Minecraft Players" },
    ]);
    expect(group.ok).toBe(true);

    // The label on the canvas and the name that will deploy must agree — a
    // create-then-rename produced a node reading "Group (2)" that deployed as
    // something else, plus a second create change.
    const canvas = await readDraftCanvas(page);
    const node = (canvas?.nodes ?? []).find(
      (n: { id: string }) => n.id === group.nodeId,
    );
    expect(node?.data?.group?.name).toBe("Minecraft Players");

    const changes = await readDraftChanges(page);
    const creates = changes.filter((c) => c.type === "create-group");
    expect(creates).toHaveLength(1);
    expect(creates[0].name).toBe("Minecraft Players");
  });

  test("Should rename a group it just created without colliding with itself", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [group] = await add(page, [
      { kind: "new_group", name: "Agent Self Rename" },
    ]);

    // Renaming to the SAME name it already has must not report "already exists"
    // against its own pending create.
    const renamed = await agent<Step[]>(page, "editNodes", [
      { node: group.nodeId, action: "rename", name: "Agent Self Rename 2" },
    ]);

    expect(renamed[0].ok).toBe(true);
    const changes = await readDraftChanges(page);
    expect(changes.filter((c) => c.type === "create-group")).toHaveLength(1);
  });

  test("Should name a placeholder peer at birth, canvas and changeset agreeing", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);

    const [server] = await add(page, [
      { kind: "server", name: "Minecraft Server", role: "destination" },
    ]);
    expect(server.ok).toBe(true);

    // The card read "Server" while the changeset said "Minecraft Server": the
    // rename went through a different setter than the create and was dropped.
    const canvas = await readDraftCanvas(page);
    const node = (canvas?.nodes ?? []).find(
      (n: { id: string }) => n.id === server.nodeId,
    );
    expect(node?.data?.placeholderName).toBe("Minecraft Server");

    const changes = await readDraftChanges(page);
    const installs = changes.filter((c) => c.type === "install-peer");
    expect(installs).toHaveLength(1);
    expect(installs[0].name).toBe("Minecraft Server");
  });

  test("Should place a destination on the right without waiting for the arrange", async ({
    dashboardAsOwner: page,
  }) => {
    await agent<Step>(page, "draftAction", "new_empty");

    const [source, policy, destination] = await add(page, [
      { kind: "new_group", name: "Agent Role Sources", role: "source" },
      { kind: "new_policy", name: "Agent Role Policy" },
      { kind: "server", name: "Agent Role Target", role: "destination" },
    ]);

    const canvas = await readDraftCanvas(page);
    const xOf = (id?: string) =>
      (canvas?.nodes ?? []).find((n: { id: string }) => n.id === id)?.position?.x;

    // A destination peer used to land on the sources side and only move once
    // the layout settled, which read as the node jumping across the canvas.
    expect(xOf(source.nodeId)).toBeLessThan(xOf(policy.nodeId));
    expect(xOf(destination.nodeId)).toBeGreaterThan(xOf(policy.nodeId));
  });

  test("Should name a policy it creates instead of leaving the default", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);

    const [policy] = await add(page, [
      {
        kind: "new_policy",
        name: "Agent Build Access",
        description: "CI runners reach the build fleet",
      },
    ]);
    expect(policy.ok).toBe(true);

    const canvas = await readDraftCanvas(page);
    const policies = (canvas?.nodes ?? [])
      .map((n: { data?: { policy?: { name?: string; description?: string } } }) => n.data?.policy)
      .filter(Boolean);
    expect(policies).toEqual([
      expect.objectContaining({
        name: "Agent Build Access",
        description: "CI runners reach the build fleet",
      }),
    ]);
  });

  test("Should edit a draft policy's protocol and ports", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [policy] = await add(page, [
      { kind: "new_policy", name: "Agent Port Narrowing" },
    ]);

    const edited = await agent<Step>(page, "editPolicy", {
      node: policy.nodeId,
      protocol: "tcp",
      ports: ["443"],
      bidirectional: false,
    });
    expect(edited.ok).toBe(true);

    const canvas = await readDraftCanvas(page);
    const rule = (canvas?.nodes ?? [])
      .map((n: { data?: { policy?: { rules?: any[] } } }) => n.data?.policy?.rules?.[0])
      .find(Boolean);
    expect(rule).toMatchObject({
      protocol: "tcp",
      ports: ["443"],
      bidirectional: false,
    });
  });

  test("Should refuse ports on a protocol that takes none", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [policy] = await add(page, [{ kind: "new_policy", name: "Agent ICMP" }]);

    const edited = await agent<Step>(page, "editPolicy", {
      node: policy.nodeId,
      protocol: "icmp",
      ports: ["443"],
    });

    expect(edited.ok).toBe(false);
    expect(edited.detail).toContain("tcp or udp");
  });

  test("Should refuse a group name that already exists", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await add(page, [{ kind: "new_group", name: "Agent Unique Group" }]);

    const [second] = await add(page, [
      { kind: "new_group", name: "Agent Unique Group" },
    ]);

    expect(second.ok).toBe(false);
    expect(second.detail).toContain("already exists");
  });

  test("Should put a placeholder peer into a group", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [server, group] = await add(page, [
      { kind: "server", name: "agent-grouped-01" },
      { kind: "new_group", name: "Agent Members" },
    ]);

    const assigned = await agent<Step[]>(page, "editNodes", [
      { node: server.nodeId, action: "add_to_group", group: group.nodeId },
    ]);

    expect(assigned[0].ok).toBe(true);
    // The peer's own card is absorbed into the group.
    await expect(canvasNode(page, server.nodeId!)).toHaveCount(0);
    const canvas = await readDraftCanvas(page);
    const grouped = (canvas?.nodes ?? []).find(
      (n: { id: string }) => n.id === group.nodeId,
    );
    expect(grouped?.data?.group?.peers_count).toBe(1);
  });

  test("Should place a group, a policy and a second group in reading order", async ({
    dashboardAsOwner: page,
  }) => {
    await agent<Step>(page, "draftAction", "new_empty");

    const [left, policy, right] = await add(page, [
      { kind: "new_group", name: "Agent Lane Sources" },
      { kind: "new_policy", name: "Agent Lane Policy" },
      { kind: "new_group", name: "Agent Lane Destinations" },
    ]);

    const canvas = await readDraftCanvas(page);
    const xOf = (id?: string) =>
      (canvas?.nodes ?? []).find((n: { id: string }) => n.id === id)?.position?.x;

    // Sources land left of the policy, the second group right of it — the same
    // reading order the arranged layout uses.
    expect(xOf(left.nodeId)).toBeLessThan(xOf(policy.nodeId));
    expect(xOf(right.nodeId)).toBeGreaterThan(xOf(policy.nodeId));
  });

  test("Should refuse to make a resource-destination policy bidirectional", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [policy] = await add(page, [
      { kind: "new_policy", name: "Agent Resource Access" },
    ]);
    const [resource] = await add(page, [
      { kind: "new_resource", name: "Agent Locked Subnet", address: "10.60.0.0/24" },
    ]);

    // policy → node puts the node on the DESTINATION side.
    const links = await agent<Step[]>(page, "connectNodes", [
      { from: policy.nodeId, to: resource.nodeId },
    ]);
    expect(links[0].ok).toBe(true);

    const edited = await agent<Step>(page, "editPolicy", {
      node: policy.nodeId,
      bidirectional: true,
    });

    // Same lock the policy editor applies: a subnet has nothing to initiate from.
    expect(edited.ok).toBe(false);
    expect(edited.detail).toContain("one-way");
  });

  test("Should treat navigating to the current view as a no-op inside a draft", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await add(page, [{ kind: "new_group", name: "Agent Nav Guard" }]);

    const step = await agent<Step>(page, "goToView", { view: "peers" });

    // Never a failure, and never advice to leave the draft — that would discard
    // the user's work.
    expect(step.ok).toBe(true);
    expect(step.detail).toContain("control_center_add");
    expect(step.detail).not.toContain("Leave draft");
    await expect(page.getByTestId("cc-draft-cancel")).toBeVisible();
  });

  test("Should refuse a view switch that would throw a draft away", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await add(page, [{ kind: "new_group", name: "Agent Nav Keep" }]);

    const step = await agent<Step>(page, "goToView", { view: "groups" });

    expect(step.ok).toBe(false);
    expect(step.detail).toContain("control_center_add");
    // Still in the draft, still holding the change.
    await expect(page.getByTestId("cc-draft-cancel")).toBeVisible();
    await expectChangeCount(page, 1);
  });

  test("Should walk away from an untouched empty draft to navigate", async ({
    dashboardAsOwner: page,
  }) => {
    await agent<Step>(page, "draftAction", "new_empty");
    await expect(page.getByTestId("cc-draft-cancel")).toBeVisible();

    const step = await agent<Step>(page, "goToView", { view: "groups" });

    expect(step.ok).toBe(true);
    expect(step.detail).toContain("empty draft");
    // Back in live mode, on the requested view.
    await expect(page.getByTestId("cc-draft-cancel")).not.toBeVisible();
    await expect(page.getByTestId("cc-flow-groups")).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  test("Should keep everything it places on screen", async ({
    dashboardAsOwner: page,
  }) => {
    await agent<Step>(page, "draftAction", "new_empty");

    const [source, policy, destination] = await add(page, [
      { kind: "new_group", name: "Agent Visible Sources", role: "source" },
      { kind: "new_policy", name: "Agent Visible Policy" },
      { kind: "new_group", name: "Agent Visible Destinations", role: "destination" },
    ]);

    // The destination column used to walk off the right-hand edge: each node was
    // placed relative to the last, and the camera never covered the whole build.
    for (const step of [source, policy, destination]) {
      expect(
        await nodeOnScreen(page, step.nodeId!),
        `${step.detail} should be on screen`,
      ).toBe(true);
    }
  });

  test("Should dim and lock the canvas while it works, then release it", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const overlay = page.getByTestId("cc-agent-busy");

    // Not awaited: the assertion has to land while the step is still running.
    const pending = add(page, [
      { kind: "new_group", name: "Agent Busy Group" },
      { kind: "new_policy", name: "Agent Busy Policy" },
    ]);

    await expect(overlay).toHaveAttribute("data-busy", "true");

    await pending;
    // Released again once the step is done (after a short linger).
    await expect(overlay).toHaveAttribute("data-busy", "false", {
      timeout: 5000,
    });
  });

  test("Should create a group with its members already in it", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);

    const [network] = await add(page, [
      { kind: "new_network", name: "Agent Member Network" },
    ]);
    const [postgres, sqlite] = await add(page, [
      {
        kind: "new_resource",
        name: "Agent Postgres",
        address: "10.9.9.9",
        network: network.nodeId,
      },
      {
        kind: "new_resource",
        name: "Agent SQLite",
        address: "10.9.9.10",
        network: network.nodeId,
      },
    ]);

    // The whole point of `members`: the group is never drawn empty, and a policy
    // pointed at it isn't pointed at nothing.
    const [group] = await add(page, [
      {
        kind: "new_group",
        name: "Agent Databases",
        members: [postgres.nodeId, sqlite.nodeId],
      },
    ]);
    expect(group.ok).toBe(true);
    expect(group.detail).toContain("2 of 2");

    const changes = await readDraftChanges(page);
    const create = changes.find(
      (c) => c.type === "create-group" && c.name === "Agent Databases",
    );
    expect(create?.resourceIds?.length).toBe(2);
    // Both are frame children, so both rows stay in the network.
    await expect(canvasNode(page, postgres.nodeId!)).toHaveCount(1);
    await expect(canvasNode(page, sqlite.nodeId!)).toHaveCount(1);
  });

  test("Should add a drawn resource to a group, and say so honestly", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [network] = await add(page, [
      { kind: "new_network", name: "Agent Join Network" },
    ]);
    const [resource] = await add(page, [
      {
        kind: "new_resource",
        name: "Agent Join Resource",
        address: "10.9.8.7",
        network: network.nodeId,
      },
    ]);
    const [group] = await add(page, [{ kind: "new_group", name: "Agent Join Group" }]);

    // A draft resource's node data holds a resource with NO id (it's derived from
    // the node id), so reading the raw field made this a silent no-op that still
    // reported success — the group came out empty.
    const joined = await agent<Step[]>(page, "editNodes", [
      { node: resource.nodeId, action: "add_to_group", group: group.nodeId },
    ]);
    expect(joined[0].ok).toBe(true);

    const changes = await readDraftChanges(page);
    const create = changes.find(
      (c) => c.type === "create-group" && c.name === "Agent Join Group",
    );
    expect(create?.resourceIds?.length).toBe(1);
    // The resource lives in a network frame, so its row STAYS: the frame is its
    // home, and a network that still deploys it must still show it.
    await expect(canvasNode(page, resource.nodeId!)).toHaveCount(1);
  });

  test("Should add a resource group inside the network frame", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [network] = await add(page, [
      { kind: "new_network", name: "Agent Frame Group Network" },
    ]);
    const [db] = await add(page, [
      {
        kind: "new_resource",
        name: "Agent Framed DB",
        address: "10.7.7.7",
        network: network.nodeId,
      },
    ]);

    const [group] = await add(page, [
      {
        kind: "new_resource_group",
        name: "Agent Frame Databases",
        network: network.nodeId,
        members: [db.nodeId],
      },
    ]);
    expect(group.ok).toBe(true);
    expect(group.nodeId).toContain("resourcegroup-new-");

    // The group is a CHILD of the frame — that's what makes it read as part of
    // the network rather than something floating beside it.
    const canvas = await readDraftCanvas(page);
    const node = (canvas?.nodes ?? []).find(
      (n: { id: string }) => n.id === group.nodeId,
    );
    expect(node?.parentId).toBe(network.nodeId);
    expect(group.detail).toContain("1 of 1");
  });

  test("Should stay locked between steps for the whole turn", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const overlay = page.getByTestId("cc-agent-busy");

    // The runtime's latch: without it the overlay dropped in every gap between
    // steps, which is seconds long — the model has to answer in between.
    await page.evaluate(() => {
      const api = window as unknown as {
        __controlCenterAgent?: { beginTurn: () => () => void };
        __controlCenterEndTurn?: () => void;
      };
      api.__controlCenterEndTurn = api.__controlCenterAgent!.beginTurn();
    });

    await add(page, [{ kind: "new_group", name: "Agent Turn Group" }]);
    // The step has finished and the linger has passed — still locked, because the
    // turn hasn't.
    await page.waitForTimeout(1200);
    await expect(overlay).toHaveAttribute("data-busy", "true");

    await page.evaluate(() =>
      (window as unknown as { __controlCenterEndTurn: () => void }).__controlCenterEndTurn(),
    );
    await expect(overlay).toHaveAttribute("data-busy", "false", {
      timeout: 5000,
    });
  });

  test("Should absorb the card when a peer is named by its account id", async ({
    dashboardAsOwner: page,
  }) => {
    const peers = await listPeers(page);
    test.skip(peers.length === 0, "needs at least one real peer in the account");
    const peer = peers[0]!;

    await enterDraft(page);
    const [group] = await add(page, [
      { kind: "new_group", name: "Agent Absorb Group" },
    ]);
    await add(page, [{ kind: "existing_peer", ref: peer.id }]);

    // Named by its ACCOUNT id, not its canvas node id — the natural thing to
    // pass after reading list_peers, and the path that left the card behind.
    const assigned = await agent<Step[]>(page, "editNodes", [
      { node: peer.id, action: "add_to_group", group: group.nodeId },
    ]);

    expect(assigned[0].ok).toBe(true);
    // The group counts it AND the card is gone — those went out of sync before.
    await expect(canvasNode(page, `peer-${peer.id}`)).toHaveCount(0);
    const after = await readDraftCanvas(page);
    const groupNode = (after?.nodes ?? []).find(
      (n: { id: string }) => n.id === group.nodeId,
    );
    expect(groupNode?.data?.group?.peers_count).toBe(1);
  });

  test("Should report the canvas it is looking at", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await add(page, [{ kind: "new_group", name: "Agent Snapshot Group" }]);

    const snapshot = await agent<{
      mode: string;
      nodes: { nodeId: string; kind: string; label: string }[];
    }>(page, "getSnapshot");

    expect(snapshot.mode).toBe("draft");
    expect(
      snapshot.nodes.some((n) => n.label === "Agent Snapshot Group"),
    ).toBe(true);
  });

  test("Should arrange and fit the canvas on request", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await add(page, [{ kind: "new_group" }, { kind: "new_policy" }]);

    const arranged = await agent<Step>(page, "canvasAction", "auto_arrange");
    expect(arranged.ok).toBe(true);
    const fitted = await agent<Step>(page, "canvasAction", "fit_view");
    expect(fitted.ok).toBe(true);
  });
});
