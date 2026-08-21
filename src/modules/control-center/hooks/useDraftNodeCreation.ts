import { useCallback } from "react";
import { Node, XYPosition, useReactFlow } from "@xyflow/react";
import { NodeType } from "@/modules/control-center/utils/nodes";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  draftUid,
  getFrameChildPosition,
  getNetworkFrameHeight,
  getTopZIndex,
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_FALLBACK_ROW,
  NETWORK_FRAME_WIDTH,
  PLACEHOLDER_BASE_NAMES,
} from "@/modules/control-center/utils/helpers";
import { getNextNewGroupName } from "@/modules/control-center/hooks/useDraftGroupActions";
import { getNetworkRef } from "@/modules/control-center/hooks/useDraftNetworkActions";
import type { PeerPlaceholderKind } from "@/modules/control-center/nodes/PeerNode";
import type { Policy } from "@/interfaces/Policy";
import type { Network } from "@/interfaces/Network";

const getNextPlaceholderName = (
  kind: PeerPlaceholderKind,
  nodes: Node[],
): string => {
  const base = PLACEHOLDER_BASE_NAMES[kind] ?? "Peer";
  const taken = new Set(
    nodes
      .map((n) => (n.data as { placeholderName?: string })?.placeholderName)
      .filter(Boolean),
  );
  let name = base;
  let i = 1;
  while (taken.has(name)) name = `${base} (${i++})`;
  return name;
};

const getNextPolicyName = (
  policies: Policy[] | undefined,
  nodes: Node[],
): string => {
  const taken = new Set<string>();
  policies?.forEach((p) => p.name && taken.add(p.name));
  nodes.forEach((n) => {
    const name = (n.data as { policy?: Policy })?.policy?.name;
    if (name) taken.add(name);
  });
  let name = "Policy";
  let i = 1;
  while (taken.has(name)) name = `Policy (${i++})`;
  return name;
};

const getNextUniqueName = (base: string, taken: Set<string>) => {
  let name = base;
  let i = 1;
  while (taken.has(name)) name = `${base} (${i++})`;
  return name;
};

export function useDraftNodeCreation() {
  const reactFlow = useReactFlow();
  const { policies, networks, networkResources, groups } =
    useControlCenterData();
  const { changes, trackCreateNetwork, trackInstallPeer, trackCreateGroup } =
    useDraftChangeset();

  // Frames elevate their z, so a node dropped over one must paint above it.
  const placeNode = useCallback(
    (node: Node, position?: XYPosition) => {
      const pos = position
        ? { x: position.x - 100, y: position.y - 30 }
        : { x: 0, y: 0 };
      reactFlow.setNodes((prev) =>
        prev.concat({ ...node, position: pos, zIndex: getTopZIndex(prev) }),
      );
    },
    [reactFlow],
  );

  // The setup key is generated later, in the install modal.
  const addPeerPlaceholder = useCallback(
    (kind: PeerPlaceholderKind, position?: XYPosition) => {
      const nodeId = `peer-draft-${draftUid()}`;
      const name = getNextPlaceholderName(kind, reactFlow.getNodes());
      placeNode(
        {
          id: nodeId,
          type: NodeType.PeerNode,
          position: { x: 0, y: 0 },
          data: {
            placeholderKind: kind,
            placeholderName: name,
            showHandles: true,
            enabled: true,
          },
        },
        position,
      );
      trackInstallPeer({ clientId: nodeId.replace("peer-", ""), name, kind });
      return nodeId;
    },
    [placeNode, reactFlow, trackInstallPeer],
  );

  // No changeset entry yet: a policy without both sides isn't deployable.
  const addBlankPolicy = useCallback(
    (position?: XYPosition) => {
      const name = getNextPolicyName(policies, reactFlow.getNodes());
      const clientId = `new-${draftUid()}`;
      const policy: Policy = {
        id: clientId,
        name,
        description: "",
        enabled: true,
        rules: [
          {
            name,
            description: "",
            enabled: true,
            sources: [],
            destinations: [],
            bidirectional: true,
            action: "accept",
            protocol: "all",
            ports: [],
          },
        ],
        source_posture_checks: [],
      };
      placeNode(
        {
          id: `policy-${clientId}`,
          type: NodeType.PolicyNode,
          position: { x: 0, y: 0 },
          data: { policy },
        },
        position,
      );
    },
    [placeNode, policies, reactFlow],
  );

  // Networks only need a name, so the change is recorded immediately.
  const addDraftNetwork = useCallback(
    (position?: XYPosition, preset?: { name: string; description?: string }) => {
      const taken = new Set<string>();
      networks?.forEach((n) => n.name && taken.add(n.name));
      reactFlow.getNodes().forEach((n) => {
        const name = (n.data as { network?: { name?: string } })?.network
          ?.name;
        if (name) taken.add(name);
      });
      const name = preset?.name || getNextUniqueName("Network", taken);
      const nodeId = `network-new-${draftUid()}`;
      placeNode(
        {
          id: nodeId,
          type: NodeType.NetworkNode,
          position: { x: 0, y: 0 },
          style: {
            width: NETWORK_FRAME_WIDTH,
            height: getNetworkFrameHeight(0),
          },
          data: { network: { name, resources: [] }, frame: true },
        },
        position,
      );
      trackCreateNetwork({
        clientId: nodeId.replace("network-", ""),
        name,
        description: preset?.description,
      });

      return nodeId;
    },
    [placeNode, reactFlow, networks, trackCreateNetwork],
  );

  // Stays out of the changeset until a network is picked; it can't deploy
  // without one.
  const addDraftResource = useCallback(
    (position?: XYPosition) => {
      const takenResources = new Set<string>();
      networkResources?.forEach((r) => r.name && takenResources.add(r.name));
      reactFlow.getNodes().forEach((n) => {
        const resourceName = (n.data as { resource?: { name?: string } })
          ?.resource?.name;
        if (resourceName) takenResources.add(resourceName);
      });
      const name = getNextUniqueName("Resource", takenResources);

      const nodeId = `resource-new-${draftUid()}`;
      placeNode(
        {
          id: nodeId,
          type: NodeType.ResourceNode,
          position: { x: 0, y: 0 },
          data: {
            resource: { name },
            enabled: true,
            showHandles: true,
          },
        },
        position,
      );
      return nodeId;
    },
    [placeNode, reactFlow, networkResources],
  );

  // With `position` (right-click in the drilled view) the card lands under the
  // cursor instead of at the next grid slot.
  const addResourceToFrame = useCallback(
    (networkNodeId: string, position?: XYPosition) => {
      const nodes = reactFlow.getNodes();
      const frame = nodes.find((n) => n.id === networkNodeId);
      // A real id for existing networks, a client id for draft ones.
      const networkRef = getNetworkRef(frame);
      if (!frame || !networkRef) return;

      const takenResources = new Set<string>();
      networkResources?.forEach((r) => r.name && takenResources.add(r.name));
      nodes.forEach((n) => {
        const resourceName = (n.data as { resource?: { name?: string } })
          ?.resource?.name;
        if (resourceName) takenResources.add(resourceName);
      });
      const name = getNextUniqueName("Resource", takenResources);

      // Child positions are frame-relative, so subtract the frame origin.
      const dropPos = position
        ? {
            x: position.x - frame.position.x - 100,
            y: position.y - frame.position.y - 30,
          }
        : getFrameChildPosition(-1);

      const nodeId = `resource-new-${draftUid()}`;
      reactFlow.setNodes((prev) =>
        prev.concat({
          id: nodeId,
          type: NodeType.ResourceNode,
          parentId: networkNodeId,
          position: dropPos,
          style: { width: NETWORK_FRAME_CHILD_WIDTH },
          // React Flow hides an unmeasured child of a hidden (drilled) parent,
          // so seed dimensions to count as measured.
          initialWidth: NETWORK_FRAME_CHILD_WIDTH,
          initialHeight: NETWORK_FRAME_FALLBACK_ROW,
          data: {
            resource: { name },
            enabled: true,
            showHandles: true,
            draftNetwork: networkRef,
            ...(position ? { drilledFreePos: true } : {}),
          },
        }),
      );
      return nodeId;
    },
    [reactFlow, networkResources],
  );

  const addResourceGroupToFrame = useCallback(
    (networkNodeId: string) => {
      const nodes = reactFlow.getNodes();
      const frame = nodes.find((n) => n.id === networkNodeId);
      if (!frame) return;

      // Must be unique against pending create-group changes too, or deploy fails.
      const taken = new Set<string>();
      groups?.forEach((g) => taken.add(g.name));
      nodes.forEach((n) => {
        const groupName = (n.data as { group?: { name?: string } })?.group
          ?.name;
        if (groupName) taken.add(groupName);
      });
      changes.forEach((c) => c.type === "create-group" && taken.add(c.name));
      const name = getNextNewGroupName(taken);

      const nodeId = `resourcegroup-new-${draftUid()}`;
      reactFlow.setNodes((prev) =>
        prev.concat({
          id: nodeId,
          type: NodeType.ResourceGroupNode,
          parentId: networkNodeId,
          // Index -1 sorts above every existing child.
          position: getFrameChildPosition(-1),
          style: { width: NETWORK_FRAME_CHILD_WIDTH },
          initialWidth: NETWORK_FRAME_CHILD_WIDTH,
          initialHeight: NETWORK_FRAME_FALLBACK_ROW,
          data: {
            group: { name },
            enabled: true,
            showHandles: true,
          },
        }),
      );
      // Members added later coalesce onto this pending create by name.
      trackCreateGroup({ clientId: nodeId, name });
      return nodeId;
    },
    [reactFlow, groups, changes, trackCreateGroup],
  );

  // Frame-ness is `data.frame`; the `network-new-` prefix stays reserved for
  // draft networks.
  const dropExistingNetworkFrame = useCallback(
    (network: Network, position?: XYPosition) => {
      if (!network.id) return;
      const frameNodeId = `network-${network.id}`;
      const childResources = (networkResources ?? []).filter((r) =>
        network.resources?.includes(r.id ?? ""),
      );
      const framePosition = position
        ? {
            x: position.x - NETWORK_FRAME_WIDTH / 2,
            y:
              position.y -
              getNetworkFrameHeight(Math.max(childResources.length, 1)) / 2,
          }
        : { x: 0, y: 0 };

      const frame: Node = {
        id: frameNodeId,
        type: NodeType.NetworkNode,
        position: framePosition,
        style: {
          width: NETWORK_FRAME_WIDTH,
          height: getNetworkFrameHeight(Math.max(childResources.length, 1)),
        },
        data: { network, frame: true },
      };
      const childRef = { networkId: network.id, name: network.name };
      const childIds = new Set(childResources.map((r) => `resource-${r.id}`));

      reactFlow.setNodes((prev) => {
        const alreadyPresent = new Set(prev.map((n) => n.id));
        // Also adopts standalone draft resources already assigned via the picker.
        const allChildIds = new Set(childIds);
        prev.forEach((n) => {
          if (
            !n.parentId &&
            !allChildIds.has(n.id) &&
            n.type === NodeType.ResourceNode &&
            (n.data as { draftNetwork?: { networkId?: string } })?.draftNetwork
              ?.networkId === network.id
          ) {
            allChildIds.add(n.id);
          }
        });
        // A resource already on the canvas is reparented, not duplicated.
        const reparent = (n: Node, index: number): Node => ({
          ...n,
          parentId: frameNodeId,
          position: getFrameChildPosition(index),
          style: { ...n.style, width: NETWORK_FRAME_CHILD_WIDTH },
          data: { ...n.data, draftNetwork: childRef },
        });
        const newChildren: Node[] = childResources
          .filter((r) => !alreadyPresent.has(`resource-${r.id}`))
          .map((r, i) => ({
            id: `resource-${r.id}`,
            type: NodeType.ResourceNode,
            parentId: frameNodeId,
            position: getFrameChildPosition(i),
            style: { width: NETWORK_FRAME_CHILD_WIDTH },
            data: {
              resource: r,
              enabled: true,
              showHandles: true,
              draftNetwork: childRef,
            },
          }));

        // ReactFlow requires parents to precede their children in the array.
        let idx = 0;
        const others = prev.filter((n) => !allChildIds.has(n.id));
        const reparented = prev
          .filter((n) => allChildIds.has(n.id))
          .map((n) => reparent(n, idx++));
        newChildren.forEach((n) => (n.position = getFrameChildPosition(idx++)));
        // Adopted draft resources grow the frame too.
        frame.style = {
          ...frame.style,
          height: getNetworkFrameHeight(Math.max(idx, 1)),
        };
        frame.zIndex = getTopZIndex(prev);
        return [...others, frame, ...reparented, ...newChildren];
      });
      return frameNodeId;
    },
    [reactFlow, networkResources],
  );

  const addBlankNode = useCallback(
    (kind: "network" | "resource", position?: XYPosition) => {
      if (kind === "network") addDraftNetwork(position);
      else addDraftResource(position);
    },
    [addDraftNetwork, addDraftResource],
  );

  return {
    placeNode,
    addPeerPlaceholder,
    addBlankNode,
    addDraftNetwork,
    addDraftResource,
    addBlankPolicy,
    addResourceToFrame,
    addResourceGroupToFrame,
    dropExistingNetworkFrame,
  };
}
