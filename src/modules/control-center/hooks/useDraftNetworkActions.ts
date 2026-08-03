import { useCallback } from "react";
import { Node, useReactFlow } from "@xyflow/react";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  DraftNetworkRef,
  getDraftResource,
  getFrameChildPosition,
  getNetworkFrameHeight,
  isFrameNode,
  makeMembershipEdge,
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_WIDTH,
} from "@/modules/control-center/utils/helpers";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// The (id XOR clientId) + display-name reference a network node resolves to.
// An existing-network frame keeps its real id on data.network → networkId;
// a draft network frame (no id yet) → networkClientId from its node id.
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

  // Frames a network node and pulses its border for a couple of seconds so a
  // just-assigned resource is easy to spot landing in it. Runs after a short
  // delay so the frame has resized and the layout reconciler has settled
  // before we fit to it.
  const highlightNetworkNode = useCallback(
    (networkNodeId: string) => {
      // While drilled into a network the frame itself is hidden and the drilled
      // world already fills the view — fitting to (and pulsing) the frame would
      // fling the camera to a strange spot. Adding a resource here should just
      // drop it into the grid, exactly like normal draft mode outside a frame.
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

  // The id of the on-canvas frame for a network ref (real id or client id),
  // or undefined when that network isn't on the canvas.
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

      // Track once it has an address. Without a network it still enters the
      // changeset — but as a blocking ISSUE (getChangeIssue → "No Network")
      // that the user resolves in Review & Deploy — instead of being silently
      // withheld. Only an address-less resource stays off the changeset.
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
              data: { ...n.data, draftNetwork: networkRef },
              ...(isFrame
                ? {
                    parentId: networkNodeId,
                    // Index -1 sorts above every existing child so the assigned
                    // resource lands FIRST; the reconciling layout re-sorts.
                    position: getFrameChildPosition(-1),
                    // Laid out by the frame, full frame width; dragging one
                    // moves the whole frame (intercepted in useDragToGroup).
                    style: { ...n.style, width: NETWORK_FRAME_CHILD_WIDTH },
                  }
                : { parentId: undefined }),
            };
          }
          // The frame grows to fit its members — and clears any drop-target
          // highlight in the SAME update so it can't linger after the drop.
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
          // Any other frame that was highlighted mid-drag clears too.
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
      // The network is on the canvas by definition here — draw the eye to it.
      highlightNetworkNode(networkNodeId);
    },
    [reactFlow, syncDraftResource, highlightNetworkNode],
  );

  // Assigns a network to a draft resource held INSIDE a group (no canvas
  // node — it was absorbed as a member): stamps the ref on every stored
  // copy (the group panel's "No network" chip disappears) and, once the
  // resource is complete (name + address), records its create-resource
  // change with the holding groups as membership.
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
      // If that network has a frame on the canvas, zoom to it and pulse.
      const nodeId = findNetworkNodeIdForRef(networkRef);
      if (nodeId) highlightNetworkNode(nodeId);
    },
    [reactFlow, trackCreateResource, findNetworkNodeIdForRef, highlightNetworkNode],
  );

  // Assigns a standalone draft resource to an EXISTING (API) network that
  // isn't a frame on the canvas — just stamps the network ref onto the node
  // (the card keeps showing the network's name) and re-syncs the changeset.
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
                // Detach from any frame it was in.
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
      // Usually not a frame on canvas (that's this path's whole point), but if
      // one happens to be, highlight it.
      const nodeId = findNetworkNodeIdForRef({
        networkId: network.id,
        name: network.name,
      });
      if (nodeId) highlightNetworkNode(nodeId);
    },
    [reactFlow, syncDraftResource, findNetworkNodeIdForRef, highlightNetworkNode],
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
                  // Preserve an existing resource's real id (editing an
                  // existing standalone resource updates the canvas only).
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
      // Existing resource (real id): record an update-resource change with the
      // edited fields. Existing resources keep their network (v1 doesn't
      // reassign), so skip the draft containment/sync path below.
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

      // Standalone save with no network chosen yet — leave draftNetwork unset
      // so the card reads "No Network". syncDraftResource still tracks it (a
      // resource with an address), where it surfaces as a blocking "No
      // Network" issue in Review & Deploy until a network is assigned.
      if (!network.networkClientId && !network.networkId) {
        setTimeout(() => syncDraftResource(nodeId), 0);
        return;
      }

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
    [reactFlow, assignResourceToNetwork, syncDraftResource, trackUpdateResource],
  );

  // Renames a draft network on the canvas node + change + dependent
  // resource nodes' network refs (labels).
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

  // Applies the routing-peer modal's pick: records the create-router change
  // (with the modal's settings) — routers have no canvas representation, the
  // frame's routing-peer count reflects the changeset. Id-less groups picked
  // in the modal get their create-group change.
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

      // Groups typed straight into the modal's selector are draft groups.
      if (group && !group.id) {
        const exists = changes.some(
          (c) => c.type === "create-group" && c.name === group.name,
        );
        if (!exists) {
          trackCreateGroup({
            clientId: `group-new-${group.name}`,
            name: group.name,
          });
        }
      }

      trackCreateRouter({
        clientId: `new-${uid()}`,
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
    [reactFlow, changes, trackCreateGroup, trackCreateRouter],
  );

  // Applies the routing-peer modal's pick to an EXISTING (API) router as a
  // draft update-router change. Mirrors addRouterFromSelection (id-less groups
  // get their create-group change) but keys on the real router + network id.
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

      // Groups typed straight into the modal's selector are draft groups.
      if (group && !group.id) {
        const exists = changes.some(
          (c) => c.type === "create-group" && c.name === group.name,
        );
        if (!exists) {
          trackCreateGroup({
            clientId: `group-new-${group.name}`,
            name: group.name,
          });
        }
      }

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
    [changes, trackCreateGroup, trackUpdateRouter],
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
