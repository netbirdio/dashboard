import { useCallback } from "react";
import { Node, useReactFlow } from "@xyflow/react";
import { Group } from "@/interfaces/Group";
import { Network } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  DraftNetworkRef,
  getDraftResource,
  getFrameChildPosition,
  getNetworkFrameHeight,
  getPlaceholderPeer,
  isCompleteDraftResource,
  makeMembershipEdge,
  makeRouterEdge,
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_WIDTH,
} from "@/modules/control-center/utils/helpers";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// The (id XOR clientId) + display-name reference a network node resolves to.
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

// Everything draft networks/resources/routers do beyond dropping the node:
// routing-peer connects, resource↔network membership, saving the resource
// editor, and the network-rename follow-through. All changeset-only — the
// API is called on deploy.
export function useDraftNetworkActions() {
  const reactFlow = useReactFlow();
  const { peers } = useControlCenterData();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const {
    changes,
    trackCreateRouter,
    trackCreateResource,
    untrackResource,
    updateDraftNetwork,
  } = useDraftChangeset();

  // Peer or group connected onto a network node → routing edge + a
  // create-router change. Placeholder peers stay out of the changeset (the
  // edge carries the intent until they install — see useDraftPeerUpgrade).
  const connectRouter = useCallback(
    ({
      networkNodeId,
      peerNodeId,
      groupNodeId,
    }: {
      networkNodeId: string;
      peerNodeId?: string;
      groupNodeId?: string;
    }) => {
      const nodes = reactFlow.getNodes();
      const networkRef = getNetworkRef(
        nodes.find((n) => n.id === networkNodeId),
      );
      const sourceNodeId = peerNodeId ?? groupNodeId;
      if (!networkRef || !sourceNodeId) return;

      // One router per (network, peer/group) pair.
      const edgeId = `router-${sourceNodeId}-${networkNodeId}`;
      if (reactFlow.getEdges().some((e) => e.id === edgeId)) return;
      reactFlow.setEdges((prev) =>
        prev.concat(makeRouterEdge(sourceNodeId, networkNodeId)),
      );

      if (peerNodeId) {
        const peerId = peerNodeId.replace("peer-", "");
        const placeholder = getPlaceholderPeer(
          nodes.find((n) => n.id === peerNodeId),
        );
        // Placeholder routers aren't deployable yet — recorded on upgrade.
        if (placeholder) return;
        const peer = peers?.find((p) => p.id === peerId);
        trackCreateRouter({
          clientId: `new-${uid()}`,
          networkId: networkRef.networkId,
          networkClientId: networkRef.networkClientId,
          networkName: networkRef.name,
          peerId,
          peerName: peer?.name ?? peerId,
        });
        return;
      }

      if (groupNodeId) {
        const node = nodes.find((n) => n.id === groupNodeId);
        const group = (node?.data as { group?: Group })?.group;
        if (!group) return;
        trackCreateRouter({
          clientId: `new-${uid()}`,
          networkId: networkRef.networkId,
          networkClientId: networkRef.networkClientId,
          networkName: networkRef.name,
          // Draft groups have no id — referenced by (unique) name.
          groupId: group.id ?? group.name,
          groupName: group.name,
        });
      }
    },
    [reactFlow, peers, trackCreateRouter],
  );

  // Re-records the create-resource change from a draft resource node's
  // current data — only complete resources are changeset-worthy. Policies
  // referencing the resource are re-run so ones held back by an incomplete
  // resource enter the changeset the moment it completes.
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

      if (!isCompleteDraftResource(node) || !network) {
        untrackResource(resource.id);
        return;
      }
      trackCreateResource({
        clientId: resource.id,
        name: resource.name,
        description: resource.description || undefined,
        address: resource.address,
        networkId: network.networkId,
        networkClientId: network.networkClientId,
        networkName: network.name,
        groupIds,
      });

      // Re-record policies referencing this resource (next tick — canvas
      // updates from the caller must land first).
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

  // Assigns (or re-assigns) a draft resource's parent network: node data +
  // containment + change sync. Draft networks are FRAMES — the resource node
  // becomes a ReactFlow child inside the frame (which grows to fit); other
  // parents fall back to a membership edge.
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
      const networkRef = getNetworkRef(
        reactFlow.getNodes().find((n) => n.id === networkNodeId),
      );
      if (!networkRef) return;
      const isFrame = networkNodeId.startsWith("network-new-");

      reactFlow.setNodes((prev) => {
        const childCount = prev.filter(
          (n) => n.parentId === networkNodeId && n.id !== resourceNodeId,
        ).length;
        let next = prev.map((n) => {
          if (n.id === resourceNodeId) {
            return {
              ...n,
              data: { ...n.data, draftNetwork: networkRef },
              ...(isFrame
                ? {
                    parentId: networkNodeId,
                    position: getFrameChildPosition(childCount),
                    // Laid out by the frame — fixed, full frame width.
                    draggable: false,
                    style: { ...n.style, width: NETWORK_FRAME_CHILD_WIDTH },
                  }
                : { parentId: undefined, draggable: true }),
            };
          }
          // The frame grows to fit its members.
          if (isFrame && n.id === networkNodeId) {
            return {
              ...n,
              style: {
                ...n.style,
                width: NETWORK_FRAME_WIDTH,
                height: getNetworkFrameHeight(childCount + 1),
              },
            };
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
      // One parent network — old membership edges go either way; a frame
      // parent shows containment instead of an edge.
      reactFlow.setEdges((prev) => {
        const kept = prev.filter(
          (e) => !e.id.startsWith(`member-${resourceNodeId}-`),
        );
        return isFrame
          ? kept
          : kept.concat(makeMembershipEdge(resourceNodeId, networkNodeId));
      });
      setTimeout(() => syncDraftResource(resourceNodeId), 0);
    },
    [reactFlow, syncDraftResource],
  );

  // Saves the draft resource editor: node data (name/address/description,
  // groups, parent network), containment/membership, change sync.
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
                  resource: { name, address, description },
                  resourceGroupIds: groupIds,
                },
              }
            : n,
        ),
      );
      // Containment / membership when the parent network is on the canvas
      // (assign also stamps draftNetwork + syncs the change).
      const networkNodeId = network.networkClientId
        ? `network-${network.networkClientId}`
        : `network-${network.networkId}`;
      const networkOnCanvas = reactFlow
        .getNodes()
        .some((n) => n.id === networkNodeId);
      if (networkOnCanvas) {
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
    [reactFlow, assignResourceToNetwork, syncDraftResource],
  );

  // Renames a draft network on the canvas node + change + dependent
  // resource nodes' network refs (labels).
  const renameDraftNetwork = useCallback(
    (node: Node, newName: string) => {
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
        description: (
          changes.find(
            (c) => c.type === "create-network" && c.clientId === clientId,
          ) as { description?: string } | undefined
        )?.description,
      });
    },
    [reactFlow, updateDraftNetwork, changes],
  );

  return {
    connectRouter,
    assignResourceToNetwork,
    saveDraftResource,
    syncDraftResource,
    renameDraftNetwork,
  };
}
