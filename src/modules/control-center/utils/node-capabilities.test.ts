import { Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import {
  canAssignToNetwork,
  canBeRoutingPeer,
  canConfigureResource,
  canInstallPeerNode,
  canRenamePeerNode,
  canRenameNetworkNode,
  canSelectPeer,
  getGroupableEntityId,
  isPlaceholderPeerNode,
} from "./node-capabilities";

// The capability spec per canvas node kind — what each node can and cannot
// do in draft mode. Connection rules live in draft-connect.test.ts; this
// covers identity-level capabilities (rename / install / peer-select /
// join-a-group).

const node = (
  id: string,
  type: string,
  data: Record<string, unknown> = {},
): Node => ({ id, type, position: { x: 0, y: 0 }, data });

// ---- Fixtures: one node per kind -------------------------------------------

const serverPlaceholder = node("peer-draft-s", "peerNode", {
  placeholderKind: "server",
  placeholderName: "Server",
});
const agentPlaceholder = node("peer-draft-a", "peerNode", {
  placeholderKind: "agent",
  placeholderName: "Agent (1)",
});
const userDevicePlaceholder = node("peer-draft-u", "peerNode", {
  placeholderKind: "user-device",
  placeholderName: "User Device",
});
// A user-device select node AFTER a peer was chosen — node id and data carry
// the real peer.
const userDeviceSelected = node("peer-p1", "peerNode", {
  placeholderKind: "user-device",
  peer: { id: "p1", name: "laptop" },
});
const realPeer = node("peer-p2", "peerNode", {
  peer: { id: "p2", name: "server-1" },
  variant: "card",
});
const groupNode = node("group-g1", "groupNode", {
  group: { id: "g1", name: "Developers" },
});
const draftGroupNode = node("group-new-1", "groupNode", {
  group: { name: "New Group" },
});
const policyNode = node("policy-new-1", "policyNode", {
  policy: { id: "new-1", name: "Policy", rules: [] },
});
const resourceNode = node("resource-r1", "resourceNode", {
  resource: { id: "r1", name: "DB", type: "host" },
});
const blankResourceNode = node("resource-new-1", "resourceNode", {
  resource: { name: "New Resource" },
});

describe("Server / Agent placeholder", () => {
  it.each([serverPlaceholder, agentPlaceholder])(
    "is a placeholder — can be renamed and installed",
    (n) => {
      expect(isPlaceholderPeerNode(n)).toBe(true);
      expect(canRenamePeerNode(n)).toBe(true);
      expect(canInstallPeerNode(n)).toBe(true);
    },
  );

  it("does NOT offer the peer-select dropdown", () => {
    expect(canSelectPeer(serverPlaceholder)).toBe(false);
    expect(canSelectPeer(agentPlaceholder)).toBe(false);
  });

  it("can join a group with its draft id", () => {
    expect(getGroupableEntityId(serverPlaceholder)).toBe("draft-s");
    expect(getGroupableEntityId(agentPlaceholder)).toBe("draft-a");
  });
});

describe("User Device placeholder (no peer chosen)", () => {
  it("can be renamed and installed, and offers the peer select", () => {
    expect(canRenamePeerNode(userDevicePlaceholder)).toBe(true);
    expect(canInstallPeerNode(userDevicePlaceholder)).toBe(true);
    expect(canSelectPeer(userDevicePlaceholder)).toBe(true);
  });

  it("can join a group with its draft id", () => {
    expect(getGroupableEntityId(userDevicePlaceholder)).toBe("draft-u");
  });
});

describe("User Device select node (peer chosen)", () => {
  it("IS the chosen peer — no longer renamable or installable", () => {
    expect(isPlaceholderPeerNode(userDeviceSelected)).toBe(false);
    expect(canRenamePeerNode(userDeviceSelected)).toBe(false);
    expect(canInstallPeerNode(userDeviceSelected)).toBe(false);
  });

  it("still offers the peer select (selection can be switched)", () => {
    expect(canSelectPeer(userDeviceSelected)).toBe(true);
  });

  it("joins a group with the real peer id", () => {
    expect(getGroupableEntityId(userDeviceSelected)).toBe("p1");
  });
});

describe("Real peer node", () => {
  it("cannot be renamed or installed (name/IP come from the machine)", () => {
    expect(canRenamePeerNode(realPeer)).toBe(false);
    expect(canInstallPeerNode(realPeer)).toBe(false);
  });

  it("does not offer the peer select", () => {
    expect(canSelectPeer(realPeer)).toBe(false);
  });

  it("can join a group with its peer id", () => {
    expect(getGroupableEntityId(realPeer)).toBe("p2");
  });
});

describe("Group nodes", () => {
  it("cannot be dropped into another group", () => {
    expect(getGroupableEntityId(groupNode)).toBe(undefined);
    expect(getGroupableEntityId(draftGroupNode)).toBe(undefined);
  });

  it("has no peer capabilities", () => {
    expect(canRenamePeerNode(groupNode)).toBe(false);
    expect(canInstallPeerNode(groupNode)).toBe(false);
    expect(canSelectPeer(groupNode)).toBe(false);
  });
});

describe("Policy node", () => {
  it("cannot be dropped into a group and has no peer capabilities", () => {
    expect(getGroupableEntityId(policyNode)).toBe(undefined);
    expect(canRenamePeerNode(policyNode)).toBe(false);
    expect(canSelectPeer(policyNode)).toBe(false);
  });
});

describe("Resource nodes", () => {
  it("a real resource can join a group with its resource id", () => {
    expect(getGroupableEntityId(resourceNode)).toBe("r1");
  });

  it("an incomplete draft resource cannot join a group (its data lives on the node)", () => {
    expect(getGroupableEntityId(blankResourceNode)).toBe(undefined);
  });

  it("a complete draft resource joins a group with its new-… id", () => {
    const completeDraft = node("resource-new-2", "resourceNode", {
      resource: { name: "DB", address: "10.0.0.5" },
      draftNetwork: { networkClientId: "new-n1", name: "Office" },
    });
    expect(getGroupableEntityId(completeDraft)).toBe("new-2");
  });

  it("has no peer capabilities", () => {
    expect(canRenamePeerNode(resourceNode)).toBe(false);
    expect(canInstallPeerNode(resourceNode)).toBe(false);
    expect(canSelectPeer(resourceNode)).toBe(false);
  });
});

describe("Networks & routing peers", () => {
  const draftNetwork = node("network-new-1", "networkNode", {
    network: { name: "Office", resources: [] },
  });
  const apiNetwork = node("network-n1", "networkNode", {
    network: { id: "n1", name: "Prod", resources: [] },
  });

  it("peers (real + placeholders) and groups can be routing peers", () => {
    expect(canBeRoutingPeer(realPeer)).toBe(true);
    expect(canBeRoutingPeer(serverPlaceholder)).toBe(true);
    expect(canBeRoutingPeer(groupNode)).toBe(true);
  });

  it("resources, networks, and policies can NOT be routing peers", () => {
    expect(canBeRoutingPeer(resourceNode)).toBe(false);
    expect(canBeRoutingPeer(draftNetwork)).toBe(false);
    expect(canBeRoutingPeer(policyNode)).toBe(false);
  });

  it("only draft networks are renamable on the canvas (v1)", () => {
    expect(canRenameNetworkNode(draftNetwork)).toBe(true);
    expect(canRenameNetworkNode(apiNetwork)).toBe(false);
  });

  it("only draft resources can be assigned to a network / configured (v1)", () => {
    expect(canAssignToNetwork(blankResourceNode)).toBe(true);
    expect(canAssignToNetwork(resourceNode)).toBe(false);
    expect(canConfigureResource(blankResourceNode)).toBe(true);
    expect(canConfigureResource(resourceNode)).toBe(false);
  });
});
