import { Connection, Node } from "@xyflow/react";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import {
  getDraftResource,
  getPlaceholderPeer,
} from "@/modules/control-center/utils/helpers";

export type DraftConnectDeps = {
  nodes: Node[];
  peers?: Peer[];
  groups?: Group[];
  networkResources?: NetworkResource[];
  updateDraftPolicy: (policy: Policy) => void;
  setPolicySourceResource: (r?: PolicyRuleResource) => void;
  setPolicyDestinationResource: (r?: PolicyRuleResource) => void;
  setPolicySourceGroups: (g: Group[]) => void;
  setPolicyDestinationGroups: (g: Group[]) => void;
  setPolicyInitialName: (name: string) => void;
  setCreatePolicyModal: (open: boolean) => void;
  // Opens the destination picker; routers are never created by drag.
  onNetworkConnect?: (params: {
    networkNodeId: string;
    policyNodeId: string;
  }) => void;
  // Restricts the modal's destination side to a network's contents.
  setPolicyDestinationScope?: (scope?: {
    resourceIds: string[];
    groupIds: string[];
  }) => void;
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
  // Resource-group rows inside a frame have group semantics.
  if (id.startsWith("resourcegroup-")) return { kind: "group", id };
  if (id.startsWith("group-")) return { kind: "group", id: id.replace("group-", "") };
  if (id.startsWith("resource-")) return { kind: "resource", id: id.replace("resource-", "") };
  if (id.startsWith("network-new-")) return { kind: "network", id };
  if (id.startsWith("network-")) return { kind: "network", id: id.replace("network-", "") };
  if (id.startsWith("policy-")) return { kind: "policy", id: id.replace("policy-", "") };
  if (id.startsWith("source-peer-")) return { kind: "peer", id: id.replace("source-peer-", "") };
  if (id.startsWith("destination-resource-")) return { kind: "resource", id: id.replace("destination-resource-", "") };
  return undefined;
};

// Node↔node opens the create-policy modal prefilled; node↔policy adds the
// group/peer to that policy side directly, respecting occupied sides.
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

  const findGroup = (id: string): Group | undefined => {
    const apiGroup = groups?.find((g) => g.id === id);
    if (apiGroup) return apiGroup;
    const canvasNode =
      currentNodes.find((n) => (n.data as any)?.group?.id === id) ??
      currentNodes.find((n) => n.id === id);
    return (canvasNode?.data as any)?.group as Group | undefined;
  };

  // Placeholder peers are not in the API list; they resolve from the canvas.
  const findPeer = (id: string): Peer | undefined =>
    peers?.find((p) => p.id === id) ??
    getPlaceholderPeer(currentNodes.find((n) => n.id === `peer-${id}`));

  const findResource = (id: string): NetworkResource | undefined =>
    networkResources?.find((r) => r.id === id) ??
    getDraftResource(currentNodes.find((n) => n.id === `resource-${id}`));

  const scopeForFrame = (frameId: string) => {
    const resourceIdSet = new Set<string>();
    const groupIds = new Set<string>();
    // API contents and canvas children are unioned: getDraftResource only
    // resolves "resource-new-" nodes, which the API can't know about.
    const apiNetwork = (
      currentNodes.find((n) => n.id === frameId)?.data as {
        network?: { id?: string; resources?: string[] };
      }
    )?.network;
    if (apiNetwork?.id) {
      (apiNetwork.resources ?? []).forEach((rid) => {
        resourceIdSet.add(rid);
        const resource = networkResources?.find((r) => r.id === rid);
        (resource?.groups as (Group | string)[] | undefined)?.forEach((g) =>
          groupIds.add(typeof g === "string" ? g : g.id ?? g.name),
        );
      });
    }
    currentNodes
      .filter((n) => n.parentId === frameId)
      .forEach((n) => {
        const resource = getDraftResource(n);
        if (resource?.id) resourceIdSet.add(resource.id);
        (
          n.data as { resourceGroupIds?: string[] }
        )?.resourceGroupIds?.forEach((idOrName) => groupIds.add(idOrName));
        if (n.type === "resourceGroupNode") {
          const group = (n.data as { group?: Group })?.group;
          if (group) groupIds.add(group.id ?? group.name);
        }
      });
    return {
      resourceIds: Array.from(resourceIdSet),
      groupIds: Array.from(groupIds),
    };
  };

  // Networks are never policy actors, so any other network drag is a no-op.
  if (sourceInfo.kind === "network") {
    if (
      targetInfo.kind === "policy" &&
      connection.sourceHandle?.startsWith("sl")
    ) {
      deps.onNetworkConnect?.({ networkNodeId: source, policyNodeId: target });
    }
    return;
  }
  if (targetInfo.kind === "network") {
    if (sourceInfo.kind === "resource") {
      deps.onResourceAssign?.({
        resourceNodeId: source,
        networkNodeId: target,
      });
    } else if (sourceInfo.kind === "policy") {
      // Either policy handle may point at a network; the pick always lands on
      // the destination side.
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

  // Groups can't be mixed with a resource on the same side.
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

  // A side holds groups XOR one peer/resource, so only an empty side applies.
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

  // Resources never sit on the source side.
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

  // The policy's left handle ("sl") adds a source, the right one a destination.
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

  // A node's left handle means it sits right of the policy → destination.
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

  // Resources are destinations only, so this drag opens the modal with the
  // roles flipped.
  if (sourceInfo.kind === "resource") {
    if (targetInfo.kind !== "peer" && targetInfo.kind !== "group") return;
    const resource = findResource(sourceInfo.id);
    if (!resource?.id) return;

    setPolicySourceResource(undefined);
    setPolicySourceGroups([]);
    setPolicyDestinationGroups([]);
    // A framed resource restricts the destination side to its network.
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

  // Reset first so a previously cancelled modal can't leak stale values in.
  setPolicySourceResource(undefined);
  setPolicyDestinationResource(undefined);
  const targetFrameId = currentNodes.find((n) => n.id === target)?.parentId;
  deps.setPolicyDestinationScope?.(
    targetFrameId?.startsWith("network-")
      ? scopeForFrame(targetFrameId)
      : undefined,
  );

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

  setPolicyInitialName(
    sourceName && destName ? `${sourceName} to ${destName}` : "",
  );

  setCreatePolicyModal(true);
}
