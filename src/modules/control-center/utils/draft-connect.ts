import { Connection, Node } from "@xyflow/react";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { getPlaceholderPeer } from "@/modules/control-center/utils/helpers";

// Everything a draft connect needs from the outside — injected so the
// connect rules are a pure function (see draft-connect.test.ts for the
// full who-can-connect-to-whom capability matrix).
export type DraftConnectDeps = {
  nodes: Node[];
  peers?: Peer[];
  groups?: Group[];
  networkResources?: NetworkResource[];
  // Applies an updated policy to the draft (changeset + redraw).
  updateDraftPolicy: (policy: Policy) => void;
  // Create-policy modal prefill + open.
  setPolicySourceResource: (r?: PolicyRuleResource) => void;
  setPolicyDestinationResource: (r?: PolicyRuleResource) => void;
  setPolicySourceGroups: (g: Group[]) => void;
  setPolicyDestinationGroups: (g: Group[]) => void;
  setPolicyInitialName: (name: string) => void;
  setCreatePolicyModal: (open: boolean) => void;
};

type NodeInfo =
  | { kind: "peer"; id: string }
  | { kind: "group"; id: string }
  | { kind: "resource"; id: string }
  | { kind: "policy"; id: string };

export const parseNodeId = (id: string): NodeInfo | undefined => {
  if (id.startsWith("peer-")) return { kind: "peer", id: id.replace("peer-", "") };
  if (id.startsWith("dest-group-")) return { kind: "group", id };
  // Draft groups have no API id — keep the full node id for lookup.
  if (id.startsWith("group-new-")) return { kind: "group", id };
  if (id.startsWith("group-")) return { kind: "group", id: id.replace("group-", "") };
  if (id.startsWith("resource-")) return { kind: "resource", id: id.replace("resource-", "") };
  if (id.startsWith("policy-")) return { kind: "policy", id: id.replace("policy-", "") };
  // Handle expanded/destination variants
  if (id.startsWith("expanded-peer-")) return { kind: "peer", id: id.replace("expanded-peer-", "") };
  if (id.startsWith("source-peer-")) return { kind: "peer", id: id.replace("source-peer-", "") };
  if (id.startsWith("destination-resource-")) return { kind: "resource", id: id.replace("destination-resource-", "") };
  return undefined;
};

// Handles a completed handle-drag between two nodes in draft mode:
//   node ↔ node   → opens the create-policy modal prefilled (groups as group
//                   lists, a peer — incl. placeholders — as the side's single
//                   peer resource; each side is groups XOR one peer/resource)
//   node ↔ policy → adds the group/peer to the policy's source or destination
//                   side directly (no modal), respecting occupied sides.
export function handleDraftConnect(
  connection: Connection,
  deps: DraftConnectDeps,
) {
  const {
    nodes: currentNodes,
    peers,
    groups,
    networkResources,
    updateDraftPolicy,
    setPolicySourceResource,
    setPolicyDestinationResource,
    setPolicySourceGroups,
    setPolicyDestinationGroups,
    setPolicyInitialName,
    setCreatePolicyModal,
  } = deps;

  const source = connection?.source;
  const target = connection?.target;

  const sourceInfo = parseNodeId(source);
  const targetInfo = parseNodeId(target);
  if (!sourceInfo || !targetInfo) return;

  // Find group from API data or from canvas node data (for draft groups)
  const findGroup = (id: string): Group | undefined => {
    const apiGroup = groups?.find((g) => g.id === id);
    if (apiGroup) return apiGroup;
    // Look up by group.id in node data, or by full node ID (for dest-group- nodes)
    const canvasNode =
      currentNodes.find((n) => (n.data as any)?.group?.id === id) ??
      currentNodes.find((n) => n.id === id);
    return (canvasNode?.data as any)?.group as Group | undefined;
  };

  // Find a peer from API data or a placeholder peer node (not installed
  // yet — pseudo-peer with its unique draft id).
  const findPeer = (id: string): Peer | undefined =>
    peers?.find((p) => p.id === id) ??
    getPlaceholderPeer(currentNodes.find((n) => n.id === `peer-${id}`));

  // Adds a group to one side of an existing policy — recorded as an
  // update-policy change and redrawn. No-ops for duplicates and for sides
  // occupied by a resource (groups can't be mixed with resources).
  const addGroupToPolicy = (
    policyNodeId: string,
    groupNodeId: string,
    side: "sources" | "destinations",
  ) => {
    const policyNode = currentNodes.find((n) => n.id === policyNodeId);
    const policy = (policyNode?.data as any)?.policy as Policy | undefined;
    const rule = policy?.rules?.[0];
    if (!policy || !rule) return;
    if (side === "sources" && rule.sourceResource) return;
    if (side === "destinations" && rule.destinationResource) return;

    const group = findGroup(groupNodeId);
    if (!group) return;

    const groupKey = (g: Group | string) =>
      typeof g === "string" ? g : g.id ?? g.name;
    const list = (rule[side] as (Group | string)[]) ?? [];
    if (list.some((g) => groupKey(g) === groupKey(group))) return;

    updateDraftPolicy({
      ...policy,
      rules: [
        { ...rule, [side]: [...list, group] },
        ...(policy.rules?.slice(1) ?? []),
      ],
    });
  };

  // Adds a single peer to one side of an existing policy — a side holds
  // either groups or ONE peer/resource, so this only applies to an empty
  // side. Placeholder peers connect with their draft id.
  const addPeerToPolicy = (
    policyNodeId: string,
    peerId: string,
    side: "sources" | "destinations",
  ) => {
    const policyNode = currentNodes.find((n) => n.id === policyNodeId);
    const policy = (policyNode?.data as any)?.policy as Policy | undefined;
    const rule = policy?.rules?.[0];
    if (!policy || !rule) return;
    const resourceKey =
      side === "sources" ? "sourceResource" : "destinationResource";
    if (rule[resourceKey]) return;
    if (((rule[side] as unknown[]) ?? []).length > 0) return;
    const peer = findPeer(peerId);
    if (!peer?.id) return;
    updateDraftPolicy({
      ...policy,
      rules: [
        { ...rule, [resourceKey]: { id: peer.id, type: "peer" } },
        ...(policy.rules?.slice(1) ?? []),
      ],
    });
  };

  // Policy handle → group/peer: the right handle adds the target as a
  // destination, the left one as a source.
  if (sourceInfo.kind === "policy") {
    const side = connection.sourceHandle?.startsWith("sl")
      ? ("sources" as const)
      : ("destinations" as const);
    if (targetInfo.kind === "group") addGroupToPolicy(source, targetInfo.id, side);
    else if (targetInfo.kind === "peer") addPeerToPolicy(source, targetInfo.id, side);
    return;
  }

  // Group/peer handle → policy: dragging from the node's left handle means
  // it sits to the right of the policy → destination; from its right
  // handle → source.
  if (targetInfo.kind === "policy") {
    const side = connection.sourceHandle?.startsWith("sl")
      ? ("destinations" as const)
      : ("sources" as const);
    if (sourceInfo.kind === "group") addGroupToPolicy(target, sourceInfo.id, side);
    else if (sourceInfo.kind === "peer") addPeerToPolicy(target, sourceInfo.id, side);
    return;
  }

  // Prefill for the create-policy modal. Each side holds either groups or
  // a single peer/resource (never both) — reset everything first so a
  // previously cancelled modal can't leak stale values into this connect.
  setPolicySourceResource(undefined);
  setPolicyDestinationResource(undefined);

  // Set source resource or group
  let sourceName: string | undefined;
  let destName: string | undefined;
  const sourceGroups: Group[] = [];
  if (sourceInfo.kind === "peer") {
    const peer = findPeer(sourceInfo.id);
    if (peer?.id) {
      setPolicySourceResource({ id: peer.id, type: "peer" });
      sourceName = peer.name;
    }
  } else if (sourceInfo.kind === "group") {
    const group = findGroup(sourceInfo.id);
    if (group) {
      sourceGroups.push(group);
      sourceName = group.name;
    }
  } else if (sourceInfo.kind === "resource") {
    const resource = networkResources?.find((r) => r.id === sourceInfo.id);
    if (resource?.id) {
      setPolicySourceResource({ id: resource.id, type: "host" });
      sourceName = resource.name;
    }
  }

  // Set destination resource or group
  const destGroups: Group[] = [];
  if (targetInfo.kind === "peer") {
    const peer = findPeer(targetInfo.id);
    if (peer?.id) {
      setPolicyDestinationResource({ id: peer.id, type: "peer" });
      destName = peer.name;
    }
  } else if (targetInfo.kind === "group") {
    const group = findGroup(targetInfo.id);
    if (group) {
      destGroups.push(group);
      destName = group.name;
    }
  } else if (targetInfo.kind === "resource") {
    const resource = networkResources?.find((r) => r.id === targetInfo.id);
    if (resource?.id) {
      setPolicyDestinationResource({ id: resource.id, type: "host" });
      destName = resource.name;
    }
  }

  setPolicySourceGroups(sourceGroups);
  setPolicyDestinationGroups(destGroups);

  // Default policy name, e.g. "All to New Group".
  setPolicyInitialName(
    sourceName && destName ? `${sourceName} to ${destName}` : "",
  );

  setCreatePolicyModal(true);
}
