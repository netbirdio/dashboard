import { Connection, Node } from "@xyflow/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { DraftConnectDeps, handleDraftConnect } from "./draft-connect";

// ---- Fixtures -------------------------------------------------------------

const peerA: Peer = { id: "a", name: "Peer A" } as Peer;
const peerB: Peer = { id: "b", name: "Peer B" } as Peer;
const groupAll: Group = { id: "g-all", name: "All" };
const groupDev: Group = { id: "g-dev", name: "Developers" };
const resourceDb: NetworkResource = {
  id: "res-1",
  name: "Database",
  address: "10.0.0.5",
  type: "host",
} as NetworkResource;

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

const node = (id: string, type: string, data: Record<string, unknown>): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data,
});

const connect = (
  source: string,
  target: string,
  sourceHandle: string | null = "sr",
): Connection =>
  ({ source, target, sourceHandle, targetHandle: null }) as Connection;

const makeDeps = (nodes: Node[] = []) =>
  ({
    nodes,
    peers: [peerA, peerB],
    groups: [groupAll, groupDev],
    networkResources: [resourceDb],
    updateDraftPolicy: vi.fn<DraftConnectDeps["updateDraftPolicy"]>(),
    setPolicySourceResource:
      vi.fn<DraftConnectDeps["setPolicySourceResource"]>(),
    setPolicyDestinationResource:
      vi.fn<DraftConnectDeps["setPolicyDestinationResource"]>(),
    setPolicySourceGroups: vi.fn<DraftConnectDeps["setPolicySourceGroups"]>(),
    setPolicyDestinationGroups:
      vi.fn<DraftConnectDeps["setPolicyDestinationGroups"]>(),
    setPolicyInitialName: vi.fn<DraftConnectDeps["setPolicyInitialName"]>(),
    setCreatePolicyModal: vi.fn<DraftConnectDeps["setCreatePolicyModal"]>(),
  }) satisfies DraftConnectDeps;

const placeholderAgent = node("peer-draft-x", "peerNode", {
  placeholderKind: "agent",
  placeholderName: "Agent",
});

// ---- node ↔ node: opens the create-policy modal prefilled ------------------

describe("connect node ↔ node (create-policy modal)", () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    deps = makeDeps([placeholderAgent]);
  });

  it("peer → peer prefills both sides as single-peer resources", () => {
    handleDraftConnect(connect("peer-a", "peer-b"), deps);
    expect(deps.setPolicySourceResource).toHaveBeenLastCalledWith({
      id: "a",
      type: "peer",
    });
    expect(deps.setPolicyDestinationResource).toHaveBeenLastCalledWith({
      id: "b",
      type: "peer",
    });
    // Groups XOR single peer: the group lists are cleared.
    expect(deps.setPolicySourceGroups).toHaveBeenCalledWith([]);
    expect(deps.setPolicyDestinationGroups).toHaveBeenCalledWith([]);
    expect(deps.setPolicyInitialName).toHaveBeenCalledWith("Peer A to Peer B");
    expect(deps.setCreatePolicyModal).toHaveBeenCalledWith(true);
  });

  it("peer → group prefills the peer as source and the group as destination", () => {
    handleDraftConnect(connect("peer-a", "group-g-dev"), deps);
    expect(deps.setPolicySourceResource).toHaveBeenLastCalledWith({
      id: "a",
      type: "peer",
    });
    expect(deps.setPolicyDestinationGroups).toHaveBeenCalledWith([groupDev]);
    expect(deps.setPolicyInitialName).toHaveBeenCalledWith(
      "Peer A to Developers",
    );
  });

  it("group → peer prefills the group as source and the peer as destination", () => {
    handleDraftConnect(connect("group-g-all", "peer-b"), deps);
    expect(deps.setPolicySourceGroups).toHaveBeenCalledWith([groupAll]);
    expect(deps.setPolicyDestinationResource).toHaveBeenLastCalledWith({
      id: "b",
      type: "peer",
    });
  });

  it("group → group prefills both group lists", () => {
    handleDraftConnect(connect("group-g-all", "group-g-dev"), deps);
    expect(deps.setPolicySourceGroups).toHaveBeenCalledWith([groupAll]);
    expect(deps.setPolicyDestinationGroups).toHaveBeenCalledWith([groupDev]);
    expect(deps.setPolicyInitialName).toHaveBeenCalledWith(
      "All to Developers",
    );
  });

  it("peer → resource prefills the resource as destination", () => {
    handleDraftConnect(connect("peer-a", "resource-res-1"), deps);
    expect(deps.setPolicyDestinationResource).toHaveBeenLastCalledWith({
      id: "res-1",
      type: "host",
    });
  });

  it("placeholder peers participate with their draft ids", () => {
    handleDraftConnect(connect("peer-draft-x", "group-g-dev"), deps);
    expect(deps.setPolicySourceResource).toHaveBeenLastCalledWith({
      id: "draft-x",
      type: "peer",
    });
    expect(deps.setPolicyInitialName).toHaveBeenCalledWith(
      "Agent to Developers",
    );
  });

  it("draft groups resolve from canvas node data by node id", () => {
    const draftGroup: Group = { name: "New Group" };
    const withDraftGroup = makeDeps([
      node("group-new-1", "groupNode", { group: draftGroup }),
    ]);
    handleDraftConnect(connect("group-new-1", "peer-a"), withDraftGroup);
    expect(withDraftGroup.setPolicySourceGroups).toHaveBeenCalledWith([
      draftGroup,
    ]);
  });

  it("always resets both peer/resource prefills first (no stale leaks)", () => {
    handleDraftConnect(connect("group-g-all", "group-g-dev"), deps);
    // Both single-entity slots explicitly cleared even for group↔group.
    expect(deps.setPolicySourceResource).toHaveBeenCalledWith(undefined);
    expect(deps.setPolicyDestinationResource).toHaveBeenCalledWith(undefined);
  });

  it("ignores connections with unknown node ids", () => {
    handleDraftConnect(connect("select-peer-node", "peer-a"), deps);
    expect(deps.setCreatePolicyModal).not.toHaveBeenCalled();
  });
});

// ---- node ↔ policy: edits the policy directly (no modal) -------------------

describe("connect node ↔ policy (direct side edit)", () => {
  const blankPolicy = makePolicy("new-1");
  const blankPolicyNode = node("policy-new-1", "policyNode", {
    policy: blankPolicy,
  });

  it("group's right handle → policy adds the group as a source", () => {
    const deps = makeDeps([blankPolicyNode]);
    handleDraftConnect(connect("group-g-all", "policy-new-1", "sr"), deps);
    const updated = deps.updateDraftPolicy.mock.calls[0][0] as Policy;
    expect(updated.rules[0].sources).toEqual([groupAll]);
    expect(deps.setCreatePolicyModal).not.toHaveBeenCalled();
  });

  it("group's left handle → policy adds the group as a destination", () => {
    const deps = makeDeps([blankPolicyNode]);
    handleDraftConnect(connect("group-g-all", "policy-new-1", "sl"), deps);
    const updated = deps.updateDraftPolicy.mock.calls[0][0] as Policy;
    expect(updated.rules[0].destinations).toEqual([groupAll]);
  });

  it("policy's left handle → group adds the group as a source", () => {
    const deps = makeDeps([blankPolicyNode]);
    handleDraftConnect(connect("policy-new-1", "group-g-dev", "sl"), deps);
    const updated = deps.updateDraftPolicy.mock.calls[0][0] as Policy;
    expect(updated.rules[0].sources).toEqual([groupDev]);
  });

  it("policy's right handle → peer adds the peer as single destination", () => {
    const deps = makeDeps([blankPolicyNode]);
    handleDraftConnect(connect("policy-new-1", "peer-b", "sr"), deps);
    const updated = deps.updateDraftPolicy.mock.calls[0][0] as Policy;
    expect(updated.rules[0].destinationResource).toEqual({
      id: "b",
      type: "peer",
    });
  });

  it("placeholder peer → policy joins with its draft id", () => {
    const deps = makeDeps([blankPolicyNode, placeholderAgent]);
    handleDraftConnect(connect("peer-draft-x", "policy-new-1", "sr"), deps);
    const updated = deps.updateDraftPolicy.mock.calls[0][0] as Policy;
    expect(updated.rules[0].sourceResource).toEqual({
      id: "draft-x",
      type: "peer",
    });
  });

  it("appends groups to an already-grouped side", () => {
    const withSource = makePolicy("new-2", { sources: [groupAll] });
    const deps = makeDeps([
      node("policy-new-2", "policyNode", { policy: withSource }),
    ]);
    handleDraftConnect(connect("group-g-dev", "policy-new-2", "sr"), deps);
    const updated = deps.updateDraftPolicy.mock.calls[0][0] as Policy;
    expect(updated.rules[0].sources).toEqual([groupAll, groupDev]);
  });

  it("does NOT add a duplicate group to a side", () => {
    const withSource = makePolicy("new-2", { sources: [groupAll] });
    const deps = makeDeps([
      node("policy-new-2", "policyNode", { policy: withSource }),
    ]);
    handleDraftConnect(connect("group-g-all", "policy-new-2", "sr"), deps);
    expect(deps.updateDraftPolicy).not.toHaveBeenCalled();
  });

  it("does NOT add a group to a side occupied by a peer/resource", () => {
    const withPeerSource = makePolicy("new-3", {
      sourceResource: { id: "a", type: "peer" },
    });
    const deps = makeDeps([
      node("policy-new-3", "policyNode", { policy: withPeerSource }),
    ]);
    handleDraftConnect(connect("group-g-all", "policy-new-3", "sr"), deps);
    expect(deps.updateDraftPolicy).not.toHaveBeenCalled();
  });

  it("does NOT add a peer to a side that already has groups (groups XOR one peer)", () => {
    const withSource = makePolicy("new-4", { sources: [groupAll] });
    const deps = makeDeps([
      node("policy-new-4", "policyNode", { policy: withSource }),
    ]);
    handleDraftConnect(connect("peer-a", "policy-new-4", "sr"), deps);
    expect(deps.updateDraftPolicy).not.toHaveBeenCalled();
  });

  it("does NOT add a second peer to a side (single peer per side)", () => {
    const withPeer = makePolicy("new-5", {
      sourceResource: { id: "a", type: "peer" },
    });
    const deps = makeDeps([
      node("policy-new-5", "policyNode", { policy: withPeer }),
    ]);
    handleDraftConnect(connect("peer-b", "policy-new-5", "sr"), deps);
    expect(deps.updateDraftPolicy).not.toHaveBeenCalled();
  });

  it("ignores resources dropped onto policies", () => {
    const deps = makeDeps([blankPolicyNode]);
    handleDraftConnect(connect("resource-res-1", "policy-new-1", "sr"), deps);
    expect(deps.updateDraftPolicy).not.toHaveBeenCalled();
    expect(deps.setCreatePolicyModal).not.toHaveBeenCalled();
  });
});

// ---- node ↔ network: routers and membership (no policy modal) --------------

describe("connect node ↔ network (routers & membership)", () => {
  const draftNetworkNode = node("network-new-1", "networkNode", {
    network: { name: "Office", resources: [] },
  });
  const draftResourceNode = node("resource-new-r1", "resourceNode", {
    resource: { name: "DB", address: "10.0.0.5" },
  });

  const withNetworkDeps = () => {
    const deps = {
      ...makeDeps([draftNetworkNode, draftResourceNode, placeholderAgent]),
      onRouterConnect: vi.fn(),
      onResourceAssign: vi.fn(),
    };
    return deps;
  };

  it("peer → network creates a router (incl. placeholders)", () => {
    const deps = withNetworkDeps();
    handleDraftConnect(connect("peer-a", "network-new-1"), deps);
    expect(deps.onRouterConnect).toHaveBeenCalledWith({
      networkNodeId: "network-new-1",
      peerNodeId: "peer-a",
    });
    handleDraftConnect(connect("peer-draft-x", "network-new-1"), deps);
    expect(deps.onRouterConnect).toHaveBeenLastCalledWith({
      networkNodeId: "network-new-1",
      peerNodeId: "peer-draft-x",
    });
    expect(deps.setCreatePolicyModal).not.toHaveBeenCalled();
  });

  it("group → network creates a group router", () => {
    const deps = withNetworkDeps();
    handleDraftConnect(connect("group-g-all", "network-new-1"), deps);
    expect(deps.onRouterConnect).toHaveBeenCalledWith({
      networkNodeId: "network-new-1",
      groupNodeId: "group-g-all",
    });
  });

  it("resource → network assigns the parent network", () => {
    const deps = withNetworkDeps();
    handleDraftConnect(connect("resource-new-r1", "network-new-1"), deps);
    expect(deps.onResourceAssign).toHaveBeenCalledWith({
      resourceNodeId: "resource-new-r1",
      networkNodeId: "network-new-1",
    });
    expect(deps.onRouterConnect).not.toHaveBeenCalled();
  });

  it("a network can never be a connect source", () => {
    const deps = withNetworkDeps();
    handleDraftConnect(connect("network-new-1", "peer-a"), deps);
    expect(deps.onRouterConnect).not.toHaveBeenCalled();
    expect(deps.setCreatePolicyModal).not.toHaveBeenCalled();
  });
});

// ---- resources in policies (destinations only) -----------------------------

describe("resources in policies (one-way)", () => {
  const draftResourceNode = node("resource-new-r1", "resourceNode", {
    resource: { name: "DB", address: "10.0.0.5" },
  });

  it("peer → draft resource prefills it as the destination (derived type)", () => {
    const deps = makeDeps([draftResourceNode]);
    handleDraftConnect(connect("peer-a", "resource-new-r1"), deps);
    expect(deps.setPolicyDestinationResource).toHaveBeenLastCalledWith({
      id: "new-r1",
      type: "host",
    });
    expect(deps.setPolicyInitialName).toHaveBeenCalledWith("Peer A to DB");
  });

  it("a resource can never be a connect source toward peers/groups/policies", () => {
    const blank = makePolicy("new-1");
    const deps = makeDeps([
      draftResourceNode,
      node("policy-new-1", "policyNode", { policy: blank }),
    ]);
    handleDraftConnect(connect("resource-res-1", "peer-a"), deps);
    handleDraftConnect(connect("resource-res-1", "group-g-all"), deps);
    expect(deps.setCreatePolicyModal).not.toHaveBeenCalled();
    expect(deps.updateDraftPolicy).not.toHaveBeenCalled();
  });

  it("policy's right handle → resource sets the single destinationResource", () => {
    const blank = makePolicy("new-1");
    const deps = makeDeps([
      draftResourceNode,
      node("policy-new-1", "policyNode", { policy: blank }),
    ]);
    handleDraftConnect(connect("policy-new-1", "resource-new-r1", "sr"), deps);
    const updated = deps.updateDraftPolicy.mock.calls[0][0] as Policy;
    expect(updated.rules[0].destinationResource).toEqual({
      id: "new-r1",
      type: "host",
    });
  });

  it("policy's left (source) handle → resource is a no-op", () => {
    const blank = makePolicy("new-1");
    const deps = makeDeps([
      draftResourceNode,
      node("policy-new-1", "policyNode", { policy: blank }),
    ]);
    handleDraftConnect(connect("policy-new-1", "resource-new-r1", "sl"), deps);
    expect(deps.updateDraftPolicy).not.toHaveBeenCalled();
  });

  it("does NOT set a resource on an occupied destination side", () => {
    const withDest = makePolicy("new-2", { destinations: [groupAll] });
    const deps = makeDeps([
      draftResourceNode,
      node("policy-new-2", "policyNode", { policy: withDest }),
    ]);
    handleDraftConnect(connect("policy-new-2", "resource-new-r1", "sr"), deps);
    expect(deps.updateDraftPolicy).not.toHaveBeenCalled();
  });
});
