import { useCallback } from "react";
import { XYPosition } from "@xyflow/react";
import useFetchApi from "@utils/api";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { getPoliciesTargetingResources } from "@/modules/control-center/utils/helpers";
import { NodeType } from "@/modules/control-center/utils/nodes";

/**
 * Placing an EXISTING peer / group / resource / network / policy on the draft
 * canvas — the components panel's drops and the assistant's `control_center_add` share this
 * so both produce the same nodes, the same network frames, and the same
 * automatically drawn policies.
 */
export function useDraftEntityDrop() {
  const {
    placeNode,
    dropExistingNetworkFrame,
  } = useDraftNodeCreation();
  const { drawPolicyOnCanvas } = useControlCenterPolicy();
  const { changes } = useDraftChangeset();
  const { data: networks } = useFetchApi<Network[]>("/networks");
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );
  const { data: policies } = useFetchApi<Policy[]>("/policies");

  /**
   * A pending `update-policy` change wins over the API data, so a policy
   * edited or disconnected in this draft comes back in its draft state, not
   * its deployed one.
   */
  const draftStateOf = useCallback(
    (policy: Policy): Policy => {
      const pending = changes.find(
        (c) => c.type === "update-policy" && c.policyId === policy.id,
      );
      return pending?.type === "update-policy" ? pending.policy : policy;
    },
    [changes],
  );

  /** Draws the policies granting access to the resources just dropped. */
  const drawResourcePolicies = useCallback(
    (droppedResources: NetworkResource[], position?: XYPosition) => {
      const related = getPoliciesTargetingResources(
        droppedResources,
        (policies ?? []).map(draftStateOf),
      );
      if (related.length === 0) return;
      // Next tick — the dropped nodes must be committed to the canvas before
      // drawPolicyOnCanvas connects the policies' edges to them.
      setTimeout(() => {
        related.forEach((policy, i) => {
          const anchor = position
            ? { x: position.x - 500, y: position.y + i * 140 }
            : undefined;
          drawPolicyOnCanvas(policy, anchor);
        });
      }, 0);
    },
    [policies, draftStateOf, drawPolicyOnCanvas],
  );

  /**
   * An existing policy draws with its sources/destinations: nodes already on
   * the canvas are connected, missing ones created around the drop point.
   */
  const dropExistingPolicy = useCallback(
    (policy: Policy, position?: XYPosition) =>
      drawPolicyOnCanvas(draftStateOf(policy), position),
    [drawPolicyOnCanvas, draftStateOf],
  );

  const dropExistingPeer = useCallback(
    (peer: Peer, position?: XYPosition) => {
      const nodeId = `peer-${peer.id}`;
      placeNode(
        {
          id: nodeId,
          type: NodeType.PeerNode,
          position: { x: 0, y: 0 },
          data: { peer, enabled: true, showHandles: true, variant: "card" },
        },
        position,
      );
      return nodeId;
    },
    [placeNode],
  );

  const dropExistingGroup = useCallback(
    (group: Group, position?: XYPosition) => {
      const nodeId = `group-${group.id}`;
      placeNode(
        {
          id: nodeId,
          type: NodeType.GroupNode,
          position: { x: 0, y: 0 },
          data: { group, enabled: true, showHandles: true },
        },
        position,
      );
      return nodeId;
    },
    [placeNode],
  );

  const dropExistingResource = useCallback(
    (resource: NetworkResource, position?: XYPosition) => {
      // Existing resources already live in a network — stamp its ref so the
      // standalone card shows the network name (read-only in v1).
      const network = networks?.find((n) =>
        n.resources?.some((r) => r === resource.id),
      );
      const nodeId = `resource-${resource.id}`;
      placeNode(
        {
          id: nodeId,
          type: NodeType.ResourceNode,
          position: { x: 0, y: 0 },
          data: {
            resource,
            enabled: true,
            showHandles: true,
            draftNetwork: network
              ? { networkId: network.id, name: network.name }
              : undefined,
          },
        },
        position,
      );
      drawResourcePolicies([resource], position);
      return nodeId;
    },
    [placeNode, networks, drawResourcePolicies],
  );

  /** An existing network drops as a full frame, with its resources' policies. */
  const dropExistingNetwork = useCallback(
    (network: Network, position?: XYPosition) => {
      const nodeId = dropExistingNetworkFrame(network, position);
      const childResources = (resources ?? []).filter((r) =>
        network.resources?.includes(r.id ?? ""),
      );
      drawResourcePolicies(childResources, position);
      return nodeId;
    },
    [dropExistingNetworkFrame, resources, drawResourcePolicies],
  );

  return {
    dropExistingPeer,
    dropExistingGroup,
    dropExistingResource,
    dropExistingNetwork,
    dropExistingPolicy,
    drawResourcePolicies,
  };
}
