import { Connection, Node } from "@xyflow/react";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import {
  getDraftResource,
  getPlaceholderPeer,
} from "@/modules/control-center/utils/helpers";

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
  // A policy connected with a network frame (either drag direction) —
  // opens the minimal destination picker for that policy. Routers are
  // created via the frame's Add button, never by drag.
  onNetworkConnect?: (params: {
    networkNodeId: string;
    policyNodeId: string;
  }) => void;
  // Restricts the create-policy modal's destination side to a network's
  // contents (connects onto a frame / framed resource / resource-group);
  // undefined clears the restriction for ordinary connects.
  setPolicyDestinationScope?: (scope?: {
    resourceIds: string[];
    groupIds: string[];
  }) => void;
  // Resource dragged onto a network node — parent-network assignment.
  onResourceAssign?: (params: {
    resourceNodeId: string;
    networkNodeId: string;
  }) => void;
};

type NodeInfo =
  | { kind: "peer"; id: string }
  | { kind: "group"; id: string }
  | { kind: "resource"; id: string }
  | { kind: "network"; id: string }
  | { kind: "policy"; id: string };

export const parseNodeId = (id: string): NodeInfo | undefined => {
  if (id.startsWith("peer-")) return { kind: "peer", id: id.replace("peer-", "") };
  if (id.startsWith("dest-group-")) return { kind: "group", id };
  // Draft groups have no API id — keep the full node id for lookup.
  if (id.startsWith("group-new-")) return { kind: "group", id };
  // Resource-group rows inside a network frame — group semantics, resolved
  // from the canvas node's data by full node id.
  if (id.startsWith("resourcegroup-")) return { kind: "group", id };
  if (id.startsWith("group-")) return { kind: "group", id: id.replace("group-", "") };
  if (id.startsWith("resource-")) return { kind: "resource", id: id.replace("resource-", "") };
  // Draft networks keep the full node id (no API id yet).
  if (id.startsWith("network-new-")) return { kind: "network", id };
  if (id.startsWith("network-")) return { kind: "network", id: id.replace("network-", "") };
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

  // Find a resource from API data or a draft resource node (pseudo-resource
  // with its "new-<uuid>" id).
  const findResource = (id: string): NetworkResource | undefined =>
    networkResources?.find((r) => r.id === id) ??
    getDraftResource(currentNodes.find((n) => n.id === `resource-${id}`));

  // Everything a network frame contains — the create-policy modal restricts
  // its destination side to this when the connect targets the network world.
  const scopeForFrame = (frameId: string) => {
    const resourceIds: string[] = [];
    const groupIds = new Set<string>();
    // Existing-network cards (dropped from the panel) have no draft
    // children — their contents come from the API data instead.
    const apiNetwork = (
      currentNodes.find((n) => n.id === frameId)?.data as {
        network?: { id?: string; resources?: string[] };
      }
    )?.network;
    if (apiNetwork?.id) {
      (apiNetwork.resources ?? []).forEach((rid) => {
        resourceIds.push(rid);
        const resource = networkResources?.find((r) => r.id === rid);
        (resource?.groups as (Group | string)[] | undefined)?.forEach((g) =>
          groupIds.add(typeof g === "string" ? g : g.id ?? g.name),
        );
      });
      return { resourceIds, groupIds: Array.from(groupIds) };
    }
    currentNodes
      .filter((n) => n.parentId === frameId)
      .forEach((n) => {
        const resource = getDraftResource(n);
        if (resource?.id) resourceIds.push(resource.id);
        (
          n.data as { resourceGroupIds?: string[] }
        )?.resourceGroupIds?.forEach((idOrName) => groupIds.add(idOrName));
        if (n.type === "resourceGroupNode") {
          const group = (n.data as { group?: Group })?.group;
          if (group) groupIds.add(group.id ?? group.name);
        }
      });
    return { resourceIds, groupIds: Array.from(groupIds) };
  };

  // Networks are never policy actors. The frame's left connector can drag
  // into a POLICY — networks, like resources, only ever sit on the
  // destination side, so the pick lands there (via the destination picker);
  // toward anything else a network-sourced drag is a no-op.
  if (sourceInfo.kind === "network") {
    if (
      targetInfo.kind === "policy" &&
      connection.sourceHandle?.startsWith("sl")
    ) {
      deps.onNetworkConnect?.({ networkNodeId: source, policyNodeId: target });
    }
    return;
  }
  // A connection dropped ONTO a frame: a POLICY drag opens the destination
  // picker (choose among the network's resources/resource-groups); a
  // peer/group drag opens the create-policy modal with the source prefilled
  // — exactly like peer→peer / group→group connects. Resources dragged onto
  // a frame re-assign their parent network instead.
  if (targetInfo.kind === "network") {
    if (sourceInfo.kind === "resource") {
      deps.onResourceAssign?.({
        resourceNodeId: source,
        networkNodeId: target,
      });
    } else if (sourceInfo.kind === "policy") {
      // Either policy handle may point at a network — the pick always lands
      // on the DESTINATION side (resources never sit on the source side).
      deps.onNetworkConnect?.({
        networkNodeId: target,
        policyNodeId: source,
      });
    } else if (sourceInfo.kind === "peer" || sourceInfo.kind === "group") {
      setPolicySourceResource(undefined);
      setPolicyDestinationResource(undefined);
      setPolicyDestinationGroups([]);
      deps.setPolicyDestinationScope?.(scopeForFrame(target));
      let sourceName: string | undefined;
      if (sourceInfo.kind === "peer") {
        const peer = findPeer(sourceInfo.id);
        if (!peer?.id) return;
        setPolicySourceResource({ id: peer.id, type: "peer" });
        setPolicySourceGroups([]);
        sourceName = peer.name;
      } else {
        const group = findGroup(sourceInfo.id);
        if (!group) return;
        setPolicySourceGroups([group]);
        sourceName = group.name;
      }
      const networkName = (
        currentNodes.find((n) => n.id === target)?.data as {
          network?: { name?: string };
        }
      )?.network?.name;
      setPolicyInitialName(
        sourceName && networkName ? `${sourceName} to ${networkName}` : "",
      );
      setCreatePolicyModal(true);
    }
    return;
  }

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

  // Adds a single resource as a policy's destination — resources never sit
  // on the source side, and a side holds groups XOR one peer/resource.
  const addResourceToPolicy = (
    policyNodeId: string,
    resourceId: string,
    side: "sources" | "destinations",
  ) => {
    if (side !== "destinations") return;
    const policyNode = currentNodes.find((n) => n.id === policyNodeId);
    const policy = (policyNode?.data as any)?.policy as Policy | undefined;
    const rule = policy?.rules?.[0];
    if (!policy || !rule) return;
    if (rule.destinationResource) return;
    if (((rule.destinations as unknown[]) ?? []).length > 0) return;
    const resource = findResource(resourceId);
    if (!resource?.id) return;
    updateDraftPolicy({
      ...policy,
      rules: [
        {
          ...rule,
          destinationResource: {
            id: resource.id,
            type: resource.type ?? "host",
          },
        },
        ...(policy.rules?.slice(1) ?? []),
      ],
    });
  };

  // Policy handle → group/peer/resource: the right handle adds the target as
  // a destination, the left one as a source.
  if (sourceInfo.kind === "policy") {
    const side = connection.sourceHandle?.startsWith("sl")
      ? ("sources" as const)
      : ("destinations" as const);
    if (targetInfo.kind === "group") addGroupToPolicy(source, targetInfo.id, side);
    else if (targetInfo.kind === "peer") addPeerToPolicy(source, targetInfo.id, side);
    else if (targetInfo.kind === "resource")
      addResourceToPolicy(source, targetInfo.id, side);
    return;
  }

  // Group/peer/resource handle → policy: dragging from the node's left
  // handle means it sits to the right of the policy → destination; from its
  // right handle → source. Resources only carry a LEFT handle, so they can
  // only ever land on the destination side (addResourceToPolicy rejects
  // sources as the backstop).
  if (targetInfo.kind === "policy") {
    const side = connection.sourceHandle?.startsWith("sl")
      ? ("destinations" as const)
      : ("sources" as const);
    if (sourceInfo.kind === "group") addGroupToPolicy(target, sourceInfo.id, side);
    else if (sourceInfo.kind === "peer") addPeerToPolicy(target, sourceInfo.id, side);
    else if (sourceInfo.kind === "resource")
      addResourceToPolicy(target, sourceInfo.id, side);
    return;
  }

  // Resources are destinations only — dragging FROM a resource onto a peer
  // or group still opens the create-policy modal, just with the roles
  // flipped: the resource lands on the destination side and the peer/group
  // becomes the source. Anything else is a no-op.
  if (sourceInfo.kind === "resource") {
    if (targetInfo.kind !== "peer" && targetInfo.kind !== "group") return;
    const resource = findResource(sourceInfo.id);
    if (!resource?.id) return;

    setPolicySourceResource(undefined);
    setPolicySourceGroups([]);
    setPolicyDestinationGroups([]);
    // A framed resource restricts the modal's destination side to its
    // network's contents — same as connecting onto it.
    const sourceFrameId = currentNodes.find((n) => n.id === source)?.parentId;
    deps.setPolicyDestinationScope?.(
      sourceFrameId?.startsWith("network-")
        ? scopeForFrame(sourceFrameId)
        : undefined,
    );
    setPolicyDestinationResource({
      id: resource.id,
      type: resource.type ?? "host",
    });

    let flipSourceName: string | undefined;
    if (targetInfo.kind === "peer") {
      const peer = findPeer(targetInfo.id);
      if (!peer?.id) return;
      setPolicySourceResource({ id: peer.id, type: "peer" });
      flipSourceName = peer.name;
    } else {
      const group = findGroup(targetInfo.id);
      if (!group) return;
      setPolicySourceGroups([group]);
      flipSourceName = group.name;
    }
    setPolicyInitialName(
      flipSourceName && resource.name
        ? `${flipSourceName} to ${resource.name}`
        : "",
    );
    setCreatePolicyModal(true);
    return;
  }

  // Prefill for the create-policy modal. Each side holds either groups or
  // a single peer/resource (never both) — reset everything first so a
  // previously cancelled modal can't leak stale values into this connect.
  setPolicySourceResource(undefined);
  setPolicyDestinationResource(undefined);
  // Connecting onto a FRAMED resource / resource-group restricts the modal's
  // destination side to that network's contents; anything else clears it.
  const targetFrameId = currentNodes.find((n) => n.id === target)?.parentId;
  deps.setPolicyDestinationScope?.(
    targetFrameId?.startsWith("network-")
      ? scopeForFrame(targetFrameId)
      : undefined,
  );

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
    // Draft resources participate with their "new-…" pseudo ids.
    const resource = findResource(targetInfo.id);
    if (resource?.id) {
      setPolicyDestinationResource({
        id: resource.id,
        type: resource.type ?? "host",
      });
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
