import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import {
  DraftChange,
  DraftChangesetProvider,
  getCanvasWarnings,
  getChangeIssue,
  hasBlockingIssues,
  useDraftChangeset,
} from "./DraftChangesetContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DraftChangesetProvider>{children}</DraftChangesetProvider>
);

const setup = () => renderHook(() => useDraftChangeset(), { wrapper });

const makePolicy = (
  id: string,
  rule: Partial<Policy["rules"][number]> = {},
): Policy => ({
  id,
  name: id,
  description: "",
  enabled: true,
  source_posture_checks: [],
  rules: [
    {
      name: id,
      description: "",
      enabled: true,
      sources: [],
      destinations: [],
      bidirectional: true,
      action: "accept",
      protocol: "all",
      ports: [],
      ...rule,
    },
  ],
});

beforeEach(() => window.localStorage.clear());

describe("group changes", () => {
  it("a rename of a draft-only group folds into its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({ clientId: "group-new-1", name: "G" }),
    );
    act(() => result.current.trackRenameGroup({ from: "G", to: "G2" }));

    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "create-group",
      name: "G2",
    });
  });

  it("renaming an existing group back to its original removes the change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackRenameGroup({ groupId: "g1", from: "A", to: "B" }),
    );
    expect(result.current.changes).toHaveLength(1);
    act(() =>
      result.current.trackRenameGroup({ groupId: "g1", from: "B", to: "A" }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("members added to a draft-only group land in its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({ clientId: "group-new-1", name: "G" }),
    );
    act(() =>
      result.current.trackAddGroupMembers({
        groupName: "G",
        peerIds: ["p1", "draft-a"],
      }),
    );
    expect(result.current.changes[0]).toMatchObject({
      type: "create-group",
      peerIds: ["p1", "draft-a"],
    });
  });

  it("rename + drag-added members share ONE update change per existing group", () => {
    const { result } = setup();
    act(() =>
      result.current.trackRenameGroup({ groupId: "g1", from: "A", to: "B" }),
    );
    act(() =>
      result.current.trackAddGroupMembers({
        groupId: "g1",
        groupName: "B",
        peerIds: ["p1"],
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-group",
      name: "B",
      peerIds: ["p1"],
    });
  });

  it("group renames follow into recorded policy changes (name-referenced draft groups)", () => {
    const { result } = setup();
    const policy = makePolicy("new-1", {
      sources: [{ name: "G" } as Group],
      destinations: [{ id: "x", name: "X" } as Group],
    });
    act(() =>
      result.current.trackCreatePolicy({ clientId: "new-1", policy }),
    );
    act(() => result.current.trackRenameGroup({ from: "G", to: "G2" }));

    const change = result.current.changes.find(
      (c) => c.type === "create-policy",
    );
    expect(
      (change as { policy: Policy }).policy.rules[0].sources,
    ).toEqual([{ name: "G2" }]);
  });

  it("replacePeerIdInGroups renames a placeholder member to the real peer id", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({
        clientId: "group-new-1",
        name: "G",
        peerIds: ["draft-a", "p9"],
      }),
    );
    act(() =>
      result.current.trackAddGroupMembers({
        groupId: "g1",
        groupName: "X",
        peerIds: ["draft-a"],
      }),
    );
    act(() => result.current.replacePeerIdInGroups("draft-a", "real-1"));

    expect(result.current.changes[0]).toMatchObject({
      peerIds: ["real-1", "p9"],
    });
    expect(result.current.changes[1]).toMatchObject({ peerIds: ["real-1"] });
  });

  it("deleting a draft-only group just drops its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({ clientId: "group-new-1", name: "G" }),
    );
    act(() => result.current.trackDeleteGroup({ name: "G" }));
    expect(result.current.changes).toHaveLength(0);
  });

  it("deleting an existing group supersedes its pending update", () => {
    const { result } = setup();
    act(() =>
      result.current.trackRenameGroup({ groupId: "g1", from: "A", to: "B" }),
    );
    act(() => result.current.trackDeleteGroup({ groupId: "g1", name: "A" }));
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0].type).toBe("delete-group");
  });
});

describe("policy changes", () => {
  it("edits to a draft-created policy fold into its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreatePolicy({
        clientId: "new-1",
        policy: makePolicy("new-1"),
      }),
    );
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "new-1",
        policy: { ...makePolicy("new-1"), name: "Renamed" },
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "create-policy",
      name: "Renamed",
    });
  });

  it("edits to a blank policy WITHOUT a create change are no-ops (stays out of changeset)", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "new-9",
        policy: makePolicy("new-9"),
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("a full edit of an existing policy supersedes earlier updates and toggles", () => {
    const { result } = setup();
    const policy = makePolicy("p1");
    act(() =>
      result.current.trackSetPolicyEnabled({
        policyId: "p1",
        name: "p1",
        enabled: false,
        originalEnabled: true,
        policy,
      }),
    );
    act(() =>
      result.current.trackUpdatePolicy({ policyId: "p1", policy }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-policy",
      origin: "edit",
    });
  });

  it("toggling an existing policy back to its live state removes the change", () => {
    const { result } = setup();
    const policy = makePolicy("p1");
    act(() =>
      result.current.trackSetPolicyEnabled({
        policyId: "p1",
        name: "p1",
        enabled: false,
        originalEnabled: true,
        policy,
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    act(() =>
      result.current.trackSetPolicyEnabled({
        policyId: "p1",
        name: "p1",
        enabled: true,
        originalEnabled: true,
        policy,
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("deleting a draft-created policy just drops its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreatePolicy({
        clientId: "new-1",
        policy: makePolicy("new-1"),
      }),
    );
    act(() =>
      result.current.trackDeletePolicy({ policyId: "new-1", name: "new-1" }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("deleting an existing policy supersedes its pending update", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: makePolicy("p1"),
      }),
    );
    act(() =>
      result.current.trackDeletePolicy({ policyId: "p1", name: "p1" }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0].type).toBe("delete-policy");
  });
});

describe("network / resource / router changes", () => {
  const resourceParams = {
    clientId: "new-r1",
    name: "DB",
    address: "10.0.0.5",
    networkClientId: "new-n1",
    networkName: "Office",
    groupIds: [] as string[],
  };

  it("records networks and folds edits into the create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateNetwork({ clientId: "new-n1", name: "Office" }),
    );
    act(() =>
      result.current.updateDraftNetwork({ clientId: "new-n1", name: "HQ" }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "create-network",
      name: "HQ",
    });
  });

  it("network renames follow into dependent resource/router labels", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateNetwork({ clientId: "new-n1", name: "Office" }),
    );
    act(() => result.current.trackCreateResource(resourceParams));
    act(() =>
      result.current.trackCreateRouter({
        clientId: "new-x",
        networkClientId: "new-n1",
        networkName: "Office",
        peerId: "p1",
        peerName: "server-1",
      }),
    );
    act(() =>
      result.current.updateDraftNetwork({ clientId: "new-n1", name: "HQ" }),
    );
    const named = result.current.changes.filter(
      (c) => "networkName" in c && c.networkName === "HQ",
    );
    expect(named).toHaveLength(2);
  });

  it("resource edits upsert by clientId (one change per resource)", () => {
    const { result } = setup();
    act(() => result.current.trackCreateResource(resourceParams));
    act(() =>
      result.current.trackCreateResource({
        ...resourceParams,
        address: "10.0.0.9",
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({ address: "10.0.0.9" });
  });

  it("routers dedup per (network, peer/group) pair", () => {
    const { result } = setup();
    const router = {
      clientId: "new-x",
      networkClientId: "new-n1",
      networkName: "Office",
      peerId: "p1",
    };
    act(() => result.current.trackCreateRouter(router));
    act(() => result.current.trackCreateRouter({ ...router, clientId: "new-y" }));
    expect(result.current.changes).toHaveLength(1);
  });

  it("removing a draft network cascades to its resources and routers", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateNetwork({ clientId: "new-n1", name: "Office" }),
    );
    act(() => result.current.trackCreateResource(resourceParams));
    act(() =>
      result.current.trackCreateRouter({
        clientId: "new-x",
        networkClientId: "new-n1",
        networkName: "Office",
        peerId: "p1",
      }),
    );
    act(() => result.current.untrackNetwork("new-n1"));
    expect(result.current.changes).toHaveLength(0);
  });

  it("removing a draft resource drops it from group memberships too", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({
        clientId: "group-new-1",
        name: "G",
        resourceIds: ["new-r1", "r-real"],
      }),
    );
    act(() => result.current.trackCreateResource(resourceParams));
    act(() => result.current.untrackResource("new-r1"));
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "create-group",
      resourceIds: ["r-real"],
    });
  });

  it("addGroupToDraftResource adds group refs to the resource change", () => {
    const { result } = setup();
    act(() => result.current.trackCreateResource(resourceParams));
    act(() => result.current.addGroupToDraftResource("new-r1", "g-1"));
    act(() => result.current.addGroupToDraftResource("new-r1", "g-1"));
    expect(result.current.changes[0]).toMatchObject({ groupIds: ["g-1"] });
  });

  it("placeholder upgrade renames router peer ids", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateRouter({
        clientId: "new-x",
        networkClientId: "new-n1",
        networkName: "Office",
        peerId: "draft-a",
        peerName: "Server",
      }),
    );
    act(() =>
      result.current.replacePeerIdInGroups("draft-a", "real-1", "server-1"),
    );
    expect(result.current.changes[0]).toMatchObject({
      peerId: "real-1",
      peerName: "server-1",
    });
  });

  it("group renames follow into resource groupIds and router group refs", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({ clientId: "group-new-1", name: "G" }),
    );
    act(() =>
      result.current.trackCreateResource({
        ...resourceParams,
        groupIds: ["G"],
      }),
    );
    act(() =>
      result.current.trackCreateRouter({
        clientId: "new-x",
        networkClientId: "new-n1",
        networkName: "Office",
        groupId: "G",
        groupName: "G",
      }),
    );
    act(() => result.current.trackRenameGroup({ from: "G", to: "G2" }));
    expect(
      result.current.changes.find((c) => c.type === "create-resource"),
    ).toMatchObject({ groupIds: ["G2"] });
    expect(
      result.current.changes.find((c) => c.type === "create-router"),
    ).toMatchObject({ groupId: "G2", groupName: "G2" });
  });

  it("update-network coalesces per network id", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdateNetwork({
        networkId: "n1",
        name: "HQ",
        originalName: "Office",
      }),
    );
    act(() =>
      result.current.trackUpdateNetwork({
        networkId: "n1",
        name: "HQ2",
        originalName: "Office",
        description: "desc",
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-network",
      networkId: "n1",
      name: "HQ2",
      description: "desc",
    });
  });

  it("update-network reverting to the live name + description drops the change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdateNetwork({
        networkId: "n1",
        name: "HQ",
        originalName: "Office",
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    act(() =>
      result.current.trackUpdateNetwork({
        networkId: "n1",
        name: "Office",
        originalName: "Office",
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("update-router coalesces per router id (a later edit supersedes)", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdateRouter({
        routerId: "r1",
        networkId: "n1",
        networkName: "Office",
        peerId: "p1",
        metric: 100,
      }),
    );
    act(() =>
      result.current.trackUpdateRouter({
        routerId: "r1",
        networkId: "n1",
        networkName: "Office",
        peerId: "p2",
        metric: 200,
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-router",
      routerId: "r1",
      peerId: "p2",
      metric: 200,
    });
  });

  const updateResourceParams = {
    resourceId: "r1",
    networkId: "n1",
    name: "DB",
    networkName: "Office",
    address: "10.0.0.5",
    enabled: true,
    groupIds: ["g1"],
  };

  it("update-resource reverting to the live state drops the change", () => {
    const { result } = setup();
    const original = {
      enabled: true,
      name: "DB",
      address: "10.0.0.5",
      groupIds: ["g1"],
    };
    act(() =>
      result.current.trackUpdateResource({
        ...updateResourceParams,
        enabled: false,
        original,
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    act(() =>
      result.current.trackUpdateResource({
        ...updateResourceParams,
        enabled: true,
        original,
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("deleting a network drops its pending update-router / update-network", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdateNetwork({
        networkId: "n1",
        name: "HQ",
        originalName: "Office",
      }),
    );
    act(() =>
      result.current.trackUpdateRouter({
        routerId: "rt1",
        networkId: "n1",
        networkName: "Office",
        peerId: "p1",
      }),
    );
    expect(result.current.changes).toHaveLength(2);
    act(() =>
      result.current.trackDeleteNetwork({ networkId: "n1", name: "Office" }),
    );
    expect(result.current.changes).toEqual([
      expect.objectContaining({ type: "delete-network", networkId: "n1" }),
    ]);
  });

  it("group renames also follow into update-resource / update-router", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdateResource({
        ...updateResourceParams,
        groupIds: ["G"],
      }),
    );
    act(() =>
      result.current.trackUpdateRouter({
        routerId: "rt1",
        networkId: "n1",
        networkName: "Office",
        groupId: "G",
        groupName: "G",
      }),
    );
    act(() => result.current.trackRenameGroup({ from: "G", to: "G2" }));
    expect(
      result.current.changes.find((c) => c.type === "update-resource"),
    ).toMatchObject({ groupIds: ["G2"] });
    expect(
      result.current.changes.find((c) => c.type === "update-router"),
    ).toMatchObject({ groupId: "G2", groupName: "G2" });
  });
});

describe("canvas warnings", () => {
  const policyNode = (id: string, rule: Partial<Policy["rules"][number]>) => ({
    id: `policy-${id}`,
    type: "policyNode",
    data: { policy: makePolicy(id, rule) },
  });

  it("warns about a complete-looking policy referencing a placeholder peer", () => {
    const nodes = [
      policyNode("new-1", {
        sources: [{ id: "g1", name: "Ops" } as Group],
        destinationResource: { id: "draft-abc", type: "host" },
      }),
    ];
    const warnings = getCanvasWarnings(nodes, []);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("isn't installed yet");
  });

  it("stays silent for visibly incomplete policies", () => {
    const nodes = [
      policyNode("new-1", {
        destinationResource: { id: "draft-abc", type: "host" },
      }),
    ];
    expect(getCanvasWarnings(nodes, [])).toHaveLength(0);
  });

  it("warns about a standalone draft resource that never became trackable", () => {
    const nodes = [
      {
        id: "resource-new-1",
        type: "resourceNode",
        data: { resource: { name: "Internal API" } },
      },
    ];
    const warnings = getCanvasWarnings(nodes, []);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("no network assigned");
  });

  it("does not warn about a tracked draft resource", () => {
    const nodes = [
      {
        id: "resource-new-1",
        type: "resourceNode",
        data: { resource: { name: "Internal API" } },
      },
    ];
    const changes = [
      {
        id: "c1",
        type: "create-resource",
        clientId: "new-1",
        name: "Internal API",
        address: "10.0.0.1",
        networkName: "Net",
        groupIds: [],
      },
    ] as any;
    expect(getCanvasWarnings(nodes, changes)).toHaveLength(0);
  });

  it("warns about a policy referencing an untracked draft resource", () => {
    const nodes = [
      policyNode("new-1", {
        sources: [{ id: "g1", name: "Ops" } as Group],
        destinationResource: { id: "new-x", type: "host" },
      }),
    ];
    const warnings = getCanvasWarnings(nodes, []);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("resource without a network");
  });
});

describe("getChangeIssue / hasBlockingIssues", () => {
  const resourceChange = (
    net: Partial<Pick<DraftChange & { type: "create-resource" }, never>> & {
      networkId?: string;
      networkClientId?: string;
      networkName?: string;
    },
  ): DraftChange =>
    ({
      id: "c1",
      type: "create-resource",
      clientId: "new-1",
      name: "Internal API",
      address: "10.0.0.1",
      networkName: net.networkName ?? "",
      networkId: net.networkId,
      networkClientId: net.networkClientId,
      groupIds: [],
    }) as DraftChange;

  it("flags a create-resource with no network as a 'No Network' issue", () => {
    const issue = getChangeIssue(resourceChange({}));
    expect(issue?.label).toBe("No Network");
    expect(issue?.message).toContain("no network assigned");
  });

  it("has no issue once the resource has an API network id", () => {
    expect(getChangeIssue(resourceChange({ networkId: "net-1" }))).toBeUndefined();
  });

  it("has no issue for a draft-network (client id) resource", () => {
    expect(
      getChangeIssue(resourceChange({ networkClientId: "new-net" })),
    ).toBeUndefined();
  });

  it("flags an uninstalled placeholder peer as an 'Install' issue", () => {
    const server = {
      id: "i1",
      type: "install-peer",
      clientId: "draft-1",
      name: "Server",
      kind: "server",
    } as DraftChange;
    const issue = getChangeIssue(server);
    expect(issue?.label).toBe("Install");
    expect(issue?.message).toContain("must be installed");
    expect(hasBlockingIssues([server])).toBe(true);
  });

  it("an installed placeholder peer carries no issue and doesn't block", () => {
    const installed = {
      id: "i1",
      type: "install-peer",
      clientId: "draft-1",
      name: "Server",
      kind: "server",
      setupKeyId: "sk-1",
      installedPeerId: "peer-1",
    } as DraftChange;
    expect(getChangeIssue(installed)).toBeUndefined();
    expect(hasBlockingIssues([installed])).toBe(false);
  });

  it("markInstallPeerInstalled keeps the entry and adopts the real peer", () => {
    const { result } = setup();
    act(() =>
      result.current.trackInstallPeer({
        clientId: "draft-1",
        name: "Server",
        kind: "server",
      }),
    );
    act(() =>
      result.current.markInstallPeerInstalled("draft-1", {
        id: "peer-1",
        name: "server-01",
      }),
    );

    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "install-peer",
      clientId: "draft-1",
      installedPeerId: "peer-1",
      name: "server-01",
    });
    expect(hasBlockingIssues(result.current.changes)).toBe(false);
  });

  it("hasBlockingIssues is true when any change carries an issue", () => {
    expect(hasBlockingIssues([resourceChange({ networkId: "net-1" })])).toBe(
      false,
    );
    expect(
      hasBlockingIssues([
        resourceChange({ networkId: "net-1" }),
        resourceChange({}),
      ]),
    ).toBe(true);
  });
});
