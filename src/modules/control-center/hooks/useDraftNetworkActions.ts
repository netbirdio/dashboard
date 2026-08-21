import { useCallback } from "react";
import { Node, useReactFlow } from "@xyflow/react";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  DraftNetworkRef,
  draftUid,
  getDraftResource,
  getFrameChildPosition,
  getNetworkFrameHeight,
  isFrameNode,
  makeMembershipEdge,
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_WIDTH,
} from "@/modules/control-center/utils/helpers";

export const getNetworkRef = (node?: Node): DraftNetworkRef | undefined => {
  const network = (node?.data as { network?: Network })?.network;
  if (!node || !network) return undefined;
  return network.id
    ? { networkId: network.id, name: network.name }
    : {
        networkClientId: node.id.replace("network-", ""),
        name: network.name,
      };
};

// Changeset-only: the API is called on deploy.
export function useDraftNetworkActions() {
  const reactFlow = useReactFlow();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const { drillDownNetworkNodeId } = useDraftMode();
  const {
    changes,
    trackCreateGroup,
    trackCreateRouter,
    trackUpdateRouter,
    trackCreateResource,
    untrackResource,
    trackUpdateResource,
    updateDraftNetwork,
  } = useDraftChangeset();

  // Pulses a network frame so a just-assigned resource is easy to spot; delayed
  // so the frame has resized and the layout settled before fitting.
  const highlightNetworkNode = useCallback(
    (networkNodeId: string) => {
      // The drilled frame is hidden, so fitting to it would fling the camera.
      if (drillDownNetworkNodeId) return;
      const PULSE_MS = 2200;
      window.setTimeout(() => {
        reactFlow.fitView({
          nodes: [{ id: networkNodeId }],
          duration: 500,
          padding: 0.35,
          maxZoom: 1,
        });
        reactFlow.setNodes((prev) =>
          prev.map((n) =>
            n.id === networkNodeId
              ? { ...n, className: `${n.className ?? ""} cc-node-pulse`.trim() }
              : n,
          ),
        );
        window.setTimeout(() => {
          reactFlow.setNodes((prev) =>
            prev.map((n) =>
              n.id === networkNodeId && n.className?.includes("cc-node-pulse")
                ? {
                    ...n,
                    className:
                      n.className.replace(/\s*cc-node-pulse/g, "").trim() ||
                      undefined,
                  }
                : n,
            ),
          );
        }, PULSE_MS);
      }, 180);
    },
    [reactFlow, drillDownNetworkNodeId],
  );

  const findNetworkNodeIdForRef = useCallback(
    (ref: DraftNetworkRef) =>
      reactFlow.getNodes().find((n) => {
        if (!isFrameNode(n)) return false;
        const net = (n.data as { network?: Network })?.network;
        if (!net) return false;
        return ref.networkId
          ? net.id === ref.networkId
          : n.id.replace("network-", "") === ref.networkClientId;
      })?.id,
    [reactFlow],
  );

  const syncDraftResource = useCallback(
    (nodeId: string) => {
      const nodes = reactFlow.getNodes();
      const node = nodes.find((n) => n.id === nodeId);
      const resource = getDraftResource(node);
      if (!node || !resource?.id) return;
      const network = (node.data as { draftNetwork?: DraftNetworkRef })
        ?.draftNetwork;
      const groupIds =
        (node.data as { resourceGroupIds?: string[] })?.resourceGroupIds ?? [];

      // Tracked as soon as it has an address; a missing network becomes a
      // blocking issue rather than a withheld change.
      if (!resource.address) {
        untrackResource(resource.id);
        return;
      }
      trackCreateResource({
        clientId: resource.id,
        name: resource.name,
        description: resource.description || undefined,
        address: resource.address,
        networkId: network?.networkId,
        networkClientId: network?.networkClientId,
        networkName: network?.name ?? "",
        groupIds,
        enabled: (node.data as { enabled?: boolean }).enabled ?? true,
      });

      const policyUpdates: Policy[] = [];
      nodes.forEach((n) => {
        const policy = (n.data as { policy?: Policy })?.policy;
        const rule = policy?.rules?.[0];
        if (!policy || !rule) return;
        if (rule.destinationResource?.id !== resource.id) return;
        policyUpdates.push({
          ...policy,
          rules: [
            {
              ...rule,
              destinationResource: {
                ...rule.destinationResource,
                type: resource.type ?? "host",
              },
            },
            ...(policy.rules?.slice(1) ?? []),
          ],
        });
      });
      if (policyUpdates.length > 0) {
        setTimeout(() => policyUpdates.forEach((p) => updateDraftPolicy(p)), 0);
      }
    },
    [reactFlow, trackCreateResource, untrackResource, updateDraftPolicy],
  );

  // A frame parent makes the resource a ReactFlow child; anything else falls
  // back to a membership edge.
  const assignResourceToNetwork = useCallback(
    ({
      resourceNodeId,
      networkNodeId,
    }: {
      resourceNodeId: string;
      networkNodeId: string;
    }) => {
      // v1: draft resources only — existing resources aren't mutated.
      if (!resourceNodeId.startsWith("resource-new-")) return;
      const networkNode = reactFlow
        .getNodes()
        .find((n) => n.id === networkNodeId);
      const networkRef = getNetworkRef(networkNode);
      if (!networkRef) return;
      const isFrame = isFrameNode(networkNode);

      reactFlow.setNodes((prev) => {
        const childCount = prev.filter(
          (n) => n.parentId === networkNodeId && n.id !== resourceNodeId,
        ).length;
        let next = prev.map((n) => {
          if (n.id === resourceNodeId) {
            return {
              ...n,
              // At drag-stop the xyflow store can still hold dragging: true,
              // and a stuck flag freezes the child.
              dragging: false,
              data: { ...n.data, draftNetwork: networkRef },
              ...(isFrame
                ? {
                    parentId: networkNodeId,
                    // Index -1 sorts above existing children.
                    position: getFrameChildPosition(-1),
                    style: { ...n.style, width: NETWORK_FRAME_CHILD_WIDTH },
                  }
                : { parentId: undefined }),
            };
          }
          // Clear the highlight in the same update so it can't linger.
          if (isFrame && n.id === networkNodeId) {
            return {
              ...n,
              data: { ...n.data, dropTarget: false },
              style: {
                ...n.style,
                width: NETWORK_FRAME_WIDTH,
                height: getNetworkFrameHeight(childCount + 1),
              },
            };
          }
          if (isFrameNode(n) && n.data.dropTarget) {
            return { ...n, data: { ...n.data, dropTarget: false } };
          }
          return n;
        });
        // ReactFlow requires parents before their children in the array.
        if (isFrame) {
          const childIdx = next.findIndex((n) => n.id === resourceNodeId);
          const parentIdx = next.findIndex((n) => n.id === networkNodeId);
          if (childIdx < parentIdx) {
            const [child] = next.splice(childIdx, 1);
            next.splice(
              next.findIndex((n) => n.id === networkNodeId) + 1,
              0,
              child,
            );
          }
        }
        return next;
      });
      // One parent network only, so old membership edges go either way.
      reactFlow.setEdges((prev) => {
        const kept = prev.filter(
          (e) => !e.id.startsWith(`member-${resourceNodeId}-`),
        );
        return isFrame
          ? kept
          : kept.concat(makeMembershipEdge(resourceNodeId, networkNodeId));
      });
      setTimeout(() => syncDraftResource(resourceNodeId), 0);
      highlightNetworkNode(networkNodeId);
    },
    [reactFlow, syncDraftResource, highlightNetworkNode],
  );

  // A draft resource absorbed into a group has no canvas node, so the ref goes
  // on every stored copy, with the holding groups as membership.
  const assignHeldResourceToNetwork = useCallback(
    ({
      resourceId,
      networkRef,
    }: {
      resourceId: string;
      networkRef: DraftNetworkRef;
    }) => {
      if (!resourceId.startsWith("new-")) return;
      const holders: string[] = [];
      let held: NetworkResource | undefined;
      reactFlow.getNodes().forEach((n) => {
        const list = (n.data as { draftResources?: NetworkResource[] })
          ?.draftResources;
        if (!list?.some((r) => r.id === resourceId)) return;
        const g = (n.data as { group?: { id?: string; name?: string } })
          ?.group;
        const ref = g?.id ?? g?.name;
        if (ref && ref !== "All" && !holders.includes(ref)) holders.push(ref);
        held = held ?? list.find((r) => r.id === resourceId);
      });
      if (!held) return;

      reactFlow.setNodes((prev) =>
        prev.map((n) => {
          const list = (n.data as { draftResources?: NetworkResource[] })
            ?.draftResources;
          if (!list?.some((r) => r.id === resourceId)) return n;
          return {
            ...n,
            data: {
              ...n.data,
              draftResources: list.map((r) =>
                r.id === resourceId
                  ? ({ ...r, draftNetwork: networkRef } as NetworkResource)
                  : r,
              ),
            },
          };
        }),
      );

      if (held.name && held.address) {
        trackCreateResource({
          clientId: resourceId,
          name: held.name,
          address: held.address,
          description: held.description,
          networkId: networkRef.networkId,
          networkClientId: networkRef.networkClientId,
          networkName: networkRef.name ?? "",
          groupIds: holders,
          enabled: true,
        });
      }
      const nodeId = findNetworkNodeIdForRef(networkRef);
      if (nodeId) highlightNetworkNode(nodeId);
    },
    [reactFlow, trackCreateResource, findNetworkNodeIdForRef, highlightNetworkNode],
  );

  // An EXISTING (API) network with no frame on the canvas: stamp the ref only.
  const assignResourceToExistingNetwork = useCallback(
    ({
      resourceNodeId,
      network,
    }: {
      resourceNodeId: string;
      network: { id: string; name: string };
    }) => {
      if (!resourceNodeId.startsWith("resource-new-")) return;
      reactFlow.setNodes((prev) =>
        prev.map((n) =>
          n.id === resourceNodeId
            ? {
                ...n,
                parentId: undefined,
                data: {
                  ...n.data,
                  draftNetwork: { networkId: network.id, name: network.name },
                },
              }
            : n,
        ),
      );
      reactFlow.setEdges((prev) =>
        prev.filter((e) => !e.id.startsWith(`member-${resourceNodeId}-`)),
      );
      setTimeout(() => syncDraftResource(resourceNodeId), 0);
      const nodeId = findNetworkNodeIdForRef({
        networkId: network.id,
        name: network.name,
      });
      if (nodeId) highlightNetworkNode(nodeId);
    },
    [reactFlow, syncDraftResource, findNetworkNodeIdForRef, highlightNetworkNode],
  );

  const saveDraftResource = useCallback(
    (params: {
      nodeId: string;
      name: string;
      address: string;
      description?: string;
      groupIds: string[];
      network: DraftNetworkRef;
    }) => {
      const { nodeId, name, address, description, groupIds, network } = params;
      reactFlow.setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  // Preserve an existing resource's real id.
                  resource: {
                    ...(n.data as { resource?: NetworkResource }).resource,
                    name,
                    address,
                    description,
                  },
                  resourceGroupIds: groupIds,
                },
              }
            : n,
        ),
      );
      // Existing resources keep their network: v1 doesn't reassign.
      if (!nodeId.startsWith("resource-new-")) {
        const node = reactFlow.getNodes().find((n) => n.id === nodeId);
        const resource = (node?.data as { resource?: NetworkResource })
          ?.resource;
        const enabled =
          (node?.data as { enabled?: boolean })?.enabled ??
          resource?.enabled ??
          true;
        if (resource?.id && network.networkId) {
          const originalGroupIds = (
            (resource.groups as (string | { id?: string })[]) ?? []
          )
            .map((g) => (typeof g === "string" ? g : g.id ?? ""))
            .filter(Boolean);
          trackUpdateResource({
            resourceId: resource.id,
            networkId: network.networkId,
            name,
            networkName: network.name,
            address,
            description,
            enabled,
            groupIds,
            // Live state — an edit reverted field-for-field drops the change.
            original: {
              enabled: resource.enabled ?? true,
              name: resource.name,
              address: resource.address,
              description: resource.description,
              groupIds: originalGroupIds,
            },
          });
        }
        return;
      }

      // Leaving draftNetwork unset makes the card read "No Network".
      if (!network.networkClientId && !network.networkId) {
        setTimeout(() => syncDraftResource(nodeId), 0);
        return;
      }

      const networkNodeId = network.networkClientId
        ? `network-${network.networkClientId}`
        : `network-${network.networkId}`;
      const nodesNow = reactFlow.getNodes();
      const networkOnCanvas = nodesNow.some((n) => n.id === networkNodeId);
      // Re-assigning an existing child would re-grid it and snap a cursor drop
      // to center.
      const alreadyChild = nodesNow.some(
        (n) => n.id === nodeId && n.parentId === networkNodeId,
      );
      if (networkOnCanvas && alreadyChild) {
        setTimeout(() => syncDraftResource(nodeId), 0);
      } else if (networkOnCanvas) {
        assignResourceToNetwork({ resourceNodeId: nodeId, networkNodeId });
      } else {
        reactFlow.setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, draftNetwork: network } }
              : n,
          ),
        );
        setTimeout(() => syncDraftResource(nodeId), 0);
      }
    },
    [reactFlow, assignResourceToNetwork, syncDraftResource, trackUpdateResource],
  );

  const renameDraftNetwork = useCallback(
    (node: Node, newName: string, description?: string) => {
      const network = (node.data as { network?: Network })?.network;
      if (!network || network.id) return;
      const clientId = node.id.replace("network-", "");
      reactFlow.setNodes((prev) =>
        prev.map((n) => {
          if (n.id === node.id) {
            return {
              ...n,
              data: { ...n.data, network: { ...network, name: newName } },
            };
          }
          const ref = (n.data as { draftNetwork?: DraftNetworkRef })
            ?.draftNetwork;
          if (ref?.networkClientId === clientId) {
            return {
              ...n,
              data: { ...n.data, draftNetwork: { ...ref, name: newName } },
            };
          }
          return n;
        }),
      );
      updateDraftNetwork({
        clientId,
        name: newName,
        description:
          description ??
          (
            changes.find(
              (c) => c.type === "create-network" && c.clientId === clientId,
            ) as { description?: string } | undefined
          )?.description,
      });
    },
    [reactFlow, updateDraftNetwork, changes],
  );

  // Groups typed straight into the modal's selector are draft groups.
  const ensureDraftGroupChange = useCallback(
    (group?: Group) => {
      if (!group || group.id) return;
      const exists = changes.some(
        (c) => c.type === "create-group" && c.name === group.name,
      );
      if (!exists) {
        trackCreateGroup({
          clientId: `group-new-${group.name}`,
          name: group.name,
        });
      }
    },
    [changes, trackCreateGroup],
  );

  // Routers have no canvas node, so the frame's routing-peer count comes from
  // the changeset.
  const addRouterFromSelection = useCallback(
    (params: {
      networkNodeId: string;
      peer?: Peer;
      peerGroups: Group[];
      metric: number;
      masquerade: boolean;
      enabled: boolean;
    }) => {
      const { networkNodeId, peer, peerGroups, metric, masquerade, enabled } =
        params;
      const frame = reactFlow
        .getNodes()
        .find((n) => n.id === networkNodeId);
      const networkRef = getNetworkRef(frame);
      const group = peerGroups[0];
      if (!networkRef || (peer ? !peer.id : !group?.name)) return;

      ensureDraftGroupChange(group);

      trackCreateRouter({
        clientId: `new-${draftUid()}`,
        networkId: networkRef.networkId,
        networkClientId: networkRef.networkClientId,
        networkName: networkRef.name,
        peerId: peer?.id,
        peerName: peer?.name,
        groupId: group ? group.id ?? group.name : undefined,
        groupName: group?.name,
        metric,
        masquerade,
        enabled,
      });
    },
    [reactFlow, ensureDraftGroupChange, trackCreateRouter],
  );

  const updateRouterFromSelection = useCallback(
    (params: {
      networkId: string;
      networkName: string;
      routerId: string;
      peer?: Peer;
      peerGroups: Group[];
      metric: number;
      masquerade: boolean;
      enabled: boolean;
    }) => {
      const {
        networkId,
        networkName,
        routerId,
        peer,
        peerGroups,
        metric,
        masquerade,
        enabled,
      } = params;
      const group = peerGroups[0];
      if (peer ? !peer.id : !group?.name) return;

      ensureDraftGroupChange(group);

      trackUpdateRouter({
        routerId,
        networkId,
        networkName,
        peerId: peer?.id,
        peerName: peer?.name,
        groupId: group ? group.id ?? group.name : undefined,
        groupName: group?.name,
        metric,
        masquerade,
        enabled,
      });
    },
    [ensureDraftGroupChange, trackUpdateRouter],
  );

  return {
    addRouterFromSelection,
    updateRouterFromSelection,
    assignResourceToNetwork,
    assignResourceToExistingNetwork,
    assignHeldResourceToNetwork,
    saveDraftResource,
    syncDraftResource,
    renameDraftNetwork,
  };
}
