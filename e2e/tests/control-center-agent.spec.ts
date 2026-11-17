import { Page, expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import { listGroups, listPeers } from "../helpers/api";
import {
  canvasNode,
  enterDraft,
  expectChangeCount,
  readDraftCanvas,
  readDraftChanges,
  resetDraftState,
} from "../helpers/control-center";

type Step = { ok: boolean; detail: string; nodeId?: string };

async function agent<T>(page: Page, method: string, arg?: unknown): Promise<T> {
  const hooksOn = await page.evaluate(
    () =>
      (window as unknown as { __ccDraftChanges?: unknown })
        .__ccDraftChanges !== undefined,
  );
  test.skip(!hooksOn, "this dashboard build exposes no e2e hooks");
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            !!(window as unknown as { __controlCenterAgent?: unknown })
              .__controlCenterAgent,
        ),
      {
        message:
          "e2e hooks are on but window.__controlCenterAgent is missing: CanvasAgentBridge did not publish its API",
      },
    )
    .toBe(true);
  return (await page.evaluate(
    async ([m, a]) => {
      const api = (window as unknown as { __controlCenterAgent: Record<string, any> })
        .__controlCenterAgent;
      return await api[m as string](a);
    },
    [method, arg ?? undefined] as [string, unknown],
  )) as T;
}

type CanvasNode = {
  id: string;
  data?: { policy?: { rules?: any[] }; group?: { name?: string } };
};

async function ruleOf(page: Page, policyNodeId?: string) {
  const canvas = await readDraftCanvas(page);
  return (canvas?.nodes ?? []).find((n: CanvasNode) => n.id === policyNodeId)
    ?.data?.policy?.rules?.[0];
}

const add = (page: Page, items: unknown[]) =>
  agent<Step[]>(page, "addNodes", items);

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
    // The two placeholders; a one-sided policy is not tracked yet.
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
    expect(links[0].detail).toContain("Connected");
    await expect(page.getByTestId("policy-continue")).not.toBeVisible();
    const rule = await ruleOf(page, policy.nodeId);
    expect(rule?.sourceResource).toEqual({
      id: server.nodeId!.replace("peer-", ""),
      type: "peer",
    });
  });

  test("Should fail a connect onto a side that is already taken", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [group, server, policy] = await add(page, [
      { kind: "new_group", name: "Agent Occupying Group" },
      { kind: "server", name: "agent-late-01" },
      { kind: "new_policy", name: "Agent Occupied Policy" },
    ]);
    const first = await agent<Step[]>(page, "connectNodes", [
      { from: group.nodeId, to: policy.nodeId },
    ]);
    expect(first[0].ok).toBe(true);

    const second = await agent<Step[]>(page, "connectNodes", [
      { from: server.nodeId, to: policy.nodeId },
    ]);

    expect(second[0].ok).toBe(false);
    expect(second[0].detail).toContain("Nothing was connected");
    expect(second[0].detail).toContain("Agent Occupying Group");
    const rule = await ruleOf(page, policy.nodeId);
    expect(rule?.sourceResource).toBeUndefined();
    expect(rule?.sources).toHaveLength(1);
  });

  test("Should refuse a connect while a dialog is still waiting for the user", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [first, second, third] = await add(page, [
      { kind: "new_group", name: "Agent Dialog First" },
      { kind: "new_group", name: "Agent Dialog Second" },
      { kind: "new_group", name: "Agent Dialog Third" },
    ]);

    const opened = await agent<Step[]>(page, "connectNodes", [
      { from: first.nodeId, to: second.nodeId },
    ]);
    expect(opened[0].ok).toBe(true);
    expect(opened[0].detail).toContain("Nothing is connected yet");
    await expect(page.getByTestId("policy-continue")).toBeVisible();

    const blocked = await agent<Step[]>(page, "connectNodes", [
      { from: first.nodeId, to: third.nodeId },
      { from: second.nodeId, to: third.nodeId },
    ]);

    expect(blocked).toHaveLength(1);
    expect(blocked[0].ok).toBe(false);
    expect(blocked[0].detail).toContain("dialog is already open");
    await expect(page.getByTestId("policy-continue")).toBeVisible();
    const changes = await readDraftChanges(page);
    expect(changes.filter((c) => c.type.includes("policy"))).toHaveLength(0);

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("policy-continue")).not.toBeVisible();
  });

  test("Should refuse a peer as a member of a network's resource group", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [network, server] = await add(page, [
      { kind: "new_network", name: "Agent Row Guard Network" },
      { kind: "server", name: "agent-row-guard-01" },
    ]);

    const [group] = await add(page, [
      {
        kind: "new_resource_group",
        name: "Agent Row Guard Group",
        network: network.nodeId,
        members: [server.nodeId],
      },
    ]);

    expect(group.ok).toBe(false);
    expect(group.detail).toContain("is a peer");
    await expect(canvasNode(page, "resourcegroup-new-")).toHaveCount(0);
    await expect(canvasNode(page, server.nodeId!)).toHaveCount(1);
  });

  test("Should name the policy a removal strips", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [source, policy, destination] = await add(page, [
      { kind: "new_group", name: "Agent Strip Sources", role: "source" },
      { kind: "new_policy", name: "Agent Stripped Policy" },
      { kind: "new_group", name: "Agent Strip Destinations", role: "destination" },
    ]);
    const links = await agent<Step[]>(page, "connectNodes", [
      { from: source.nodeId, to: policy.nodeId },
      { from: policy.nodeId, to: destination.nodeId },
    ]);
    expect(links.every((l) => l.ok)).toBe(true);

    const removed = await agent<Step[]>(page, "editNodes", [
      { node: source.nodeId, action: "remove" },
    ]);

    expect(removed[0].ok).toBe(true);
    expect(removed[0].detail).toContain("Agent Stripped Policy");
    expect(removed[0].detail).not.toContain("No policy changed");
    expect((await ruleOf(page, policy.nodeId))?.sources).toHaveLength(0);
  });

  test("Should refuse to rename or delete the All group", async ({
    dashboardAsOwner: page,
  }) => {
    const all = (await listGroups(page)).find((g) => g.name === "All");
    test.skip(!all, "needs the account's All group");

    await enterDraft(page, { blank: true });
    const [group] = await add(page, [{ kind: "existing_group", ref: all!.id }]);
    expect(group.nodeId).toBeTruthy();

    const snapshot = await agent<{
      nodes: { nodeId: string; can: { rename: boolean; delete: boolean } }[];
    }>(page, "getSnapshot");
    const described = snapshot.nodes.find((n) => n.nodeId === group.nodeId);
    expect(described?.can).toMatchObject({ rename: false, delete: false });

    const [renamed, deleted] = await agent<Step[]>(page, "editNodes", [
      { node: group.nodeId, action: "rename", name: "Agent Not All" },
      { node: group.nodeId, action: "delete" },
    ]);

    expect(renamed.ok).toBe(false);
    expect(renamed.detail).toContain("system-managed");
    expect(deleted.ok).toBe(false);
    const canvas = await readDraftCanvas(page);
    const node = (canvas?.nodes ?? []).find(
      (n: CanvasNode) => n.id === group.nodeId,
    );
    expect(node?.data?.group?.name).toBe("All");
    await expectChangeCount(page, 0);
  });

  test("Should refuse an unknown draft action instead of starting a draft", async ({
    dashboardAsOwner: page,
  }) => {
    const step = await agent<Step>(page, "draftAction", "deploy");

    expect(step.ok).toBe(false);
    expect(step.detail).toContain("Unknown draft action");
    await expect(page.getByTestId("cc-draft-cancel")).not.toBeVisible();
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

    // Connecting from the policy puts the node on its destination side.
    const links = await agent<Step[]>(page, "connectNodes", [
      { from: policy.nodeId, to: resource.nodeId },
    ]);
    expect(links[0].ok).toBe(true);

    const edited = await agent<Step>(page, "editPolicy", {
      node: policy.nodeId,
      bidirectional: true,
    });

    expect(edited.ok).toBe(false);
    expect(edited.detail).toContain("one-way");
  });

  test("Should treat navigating to the current view as a no-op inside a draft", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await add(page, [{ kind: "new_group", name: "Agent Nav Guard" }]);

    const step = await agent<Step>(page, "goToView", { view: "peers" });

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
    // Frame children keep their rows when grouped.
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

    const joined = await agent<Step[]>(page, "editNodes", [
      { node: resource.nodeId, action: "add_to_group", group: group.nodeId },
    ]);
    expect(joined[0].ok).toBe(true);

    const changes = await readDraftChanges(page);
    const create = changes.find(
      (c) => c.type === "create-group" && c.name === "Agent Join Group",
    );
    expect(create?.resourceIds?.length).toBe(1);
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

    const canvas = await readDraftCanvas(page);
    const node = (canvas?.nodes ?? []).find(
      (n: { id: string }) => n.id === group.nodeId,
    );
    expect(node?.parentId).toBe(network.nodeId);
    expect(group.detail).toContain("1 of 1");
  });

  test("Should leave no stray group when a resource group's name is taken", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const [network] = await add(page, [
      { kind: "new_network", name: "Agent Taken Name Network" },
      { kind: "new_group", name: "Agent Taken Name" },
    ]);

    const [group] = await add(page, [
      {
        kind: "new_resource_group",
        name: "Agent Taken Name",
        network: network.nodeId,
      },
    ]);

    expect(group.ok).toBe(false);
    expect(group.detail).toContain("already exists");
    await expect(canvasNode(page, "resourcegroup-new-")).toHaveCount(0);
    const changes = await readDraftChanges(page);
    expect(changes.filter((c) => c.type === "create-group")).toHaveLength(1);
  });

  test("Should stay locked between steps for the whole turn", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    const overlay = page.getByTestId("cc-agent-busy");

    await page.evaluate(() => {
      const api = window as unknown as {
        __controlCenterAgent?: { beginTurn: () => () => void };
        __controlCenterEndTurn?: () => void;
      };
      api.__controlCenterEndTurn = api.__controlCenterAgent!.beginTurn();
    });

    await add(page, [{ kind: "new_group", name: "Agent Turn Group" }]);
    // Outlasts the overlay's post-step linger.
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

    const assigned = await agent<Step[]>(page, "editNodes", [
      { node: peer.id, action: "add_to_group", group: group.nodeId },
    ]);

    expect(assigned[0].ok).toBe(true);
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
