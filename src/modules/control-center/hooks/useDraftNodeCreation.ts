import { useCallback } from "react";
import { Node, XYPosition, useReactFlow } from "@xyflow/react";
import { NodeType } from "@/modules/control-center/utils/nodes";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  getFrameChildPosition,
  getNetworkFrameHeight,
  getTopZIndex,
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_WIDTH,
  PLACEHOLDER_BASE_NAMES,
} from "@/modules/control-center/utils/helpers";
import { getNextNewGroupName } from "@/modules/control-center/hooks/useDraftGroupActions";
import { getNetworkRef } from "@/modules/control-center/hooks/useDraftNetworkActions";
import type { PeerPlaceholderKind } from "@/modules/control-center/nodes/PeerNode";
import type { Policy } from "@/interfaces/Policy";
import type { Network } from "@/interfaces/Network";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Unique per-drop placeholder names: "Agent", "Agent (1)", … (same pattern
// as draft groups). Renamed placeholders free their default name again.
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

// Unique blank-policy names: "Policy", "Policy (1)", … — against API
// policies and every policy node already on the canvas.
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

// Unique entity names against existing API entities, canvas nodes, and (for
// entities carried only in changes) the pending changes.
const getNextUniqueName = (base: string, taken: Set<string>) => {
  let name = base;
  let i = 1;
  while (taken.has(name)) name = `${base} (${i++})`;
  return name;
};

// Creating draft nodes (peer placeholders, blank policies, draft networks
// and resources) — shared by the components picker (drop) and the canvas
// context menu (click/shortcut).
export function useDraftNodeCreation() {
  const reactFlow = useReactFlow();
  const { policies, networks, networkResources } = useControlCenterData();
  const { trackCreateNetwork, trackInstallPeer } = useDraftChangeset();

  // Places a node roughly centered under the given flow position, on top of
  // everything already on the canvas (frames elevate their z — a peer dropped
  // over one must paint above it, not behind).
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

  // No setup key is created here — the key is generated inside the install
  // modal, only when the user actually installs. The pending install itself
  // IS tracked so Review & Deploy tells the user this step is on them.
  const addPeerPlaceholder = useCallback(
    (kind: PeerPlaceholderKind, position?: XYPosition) => {
      const nodeId = `peer-draft-${uid()}`;
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

  // Drops a blank policy node — no modal, no changeset entry. A policy
  // without a source and a destination isn't deployable; it only enters the
  // changeset once connects give it both sides (see updateDraftPolicy).
  const addBlankPolicy = useCallback(
    (position?: XYPosition) => {
      const name = getNextPolicyName(policies, reactFlow.getNodes());
      const clientId = `new-${uid()}`;
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

  // Drops a draft network — networks only need a name, so the create-network
  // change is recorded immediately (symmetry with addNewGroup).
  const addDraftNetwork = useCallback(
    (position?: XYPosition, preset?: { name: string; description?: string }) => {
      const taken = new Set<string>();
      networks?.forEach((n) => n.name && taken.add(n.name));
      reactFlow.getNodes().forEach((n) => {
        const name = (n.data as { network?: { name?: string } })?.network
          ?.name;
        if (name) taken.add(name);
      });
      // A preset name (from the "Create New Network" modal) is used verbatim;
      // an auto-drop gets the next unique "Network (n)".
      const name = preset?.name || getNextUniqueName("Network", taken);
      const nodeId = `network-new-${uid()}`;
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

  // Drops a STANDALONE draft resource card (no network yet). A resource still
  // needs a network to deploy, but assignment is a deliberate step: the card
  // shows a "No Network" control (see ResourceNode) and stays out of the
  // changeset until it's dropped into a frame or a network is picked. The
  // editor opens on node click; the address stays a dimmed placeholder until
  // set.
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

      const nodeId = `resource-new-${uid()}`;
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

  // Adds a draft resource INTO an existing network frame (context menu's
  // "Add Resource") — child of the frame, laid out by useNetworkFrameLayout.
  const addResourceToFrame = useCallback(
    (networkNodeId: string) => {
      const nodes = reactFlow.getNodes();
      const frame = nodes.find((n) => n.id === networkNodeId);
      // Resolve the frame's network ref (real id for existing-network frames,
      // client id for draft ones) instead of assuming a client id.
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

      const nodeId = `resource-new-${uid()}`;
      reactFlow.setNodes((prev) =>
        prev.concat({
          id: nodeId,
          type: NodeType.ResourceNode,
          parentId: networkNodeId,
          // Index -1 sorts above every existing child, so the newly added
          // node lands FIRST in the frame's grid (the reconciling layout
          // re-sorts by y/x and repositions everything).
          position: getFrameChildPosition(-1),
          style: { width: NETWORK_FRAME_CHILD_WIDTH },
          data: {
            resource: { name },
            enabled: true,
            showHandles: true,
            draftNetwork: networkRef,
          },
        }),
      );
      return nodeId;
    },
    [reactFlow, networkResources],
  );

  // Adds a blank draft resource GROUP into an existing network frame (context
  // menu's "Add Resource Group") — child of the frame, laid out by
  // useNetworkFrameLayout like a resource row. Editable later.
  const addResourceGroupToFrame = useCallback(
    (networkNodeId: string) => {
      const nodes = reactFlow.getNodes();
      const frame = nodes.find((n) => n.id === networkNodeId);
      if (!frame) return;

      const taken = new Set<string>();
      nodes.forEach((n) => {
        const groupName = (n.data as { group?: { name?: string } })?.group
          ?.name;
        if (groupName) taken.add(groupName);
      });
      const name = getNextNewGroupName(taken);

      const nodeId = `resourcegroup-new-${uid()}`;
      reactFlow.setNodes((prev) =>
        prev.concat({
          id: nodeId,
          type: NodeType.ResourceGroupNode,
          parentId: networkNodeId,
          // Index -1 sorts above every existing child, so the newly added
          // node lands FIRST in the frame's grid (the reconciling layout
          // re-sorts by y/x and repositions everything).
          position: getFrameChildPosition(-1),
          style: { width: NETWORK_FRAME_CHILD_WIDTH },
          data: {
            group: { name },
            enabled: true,
            showHandles: true,
          },
        }),
      );
      return nodeId;
    },
    [reactFlow],
  );

  // Drops an EXISTING network as a full frame (same chrome + behaviour as a
  // draft network frame). It keeps its REAL id (`network-<realId>`, data.network
  // with its id) and is marked a frame via `data.frame` — frame-ness is a flag,
  // not the `network-new-` prefix (which stays reserved for draft networks). Its
  // existing resources are created as read-only child nodes. No create-network
  // change — the network already exists (v1 doesn't mutate it); dropping it is
  // for building policies around its resources.
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
        // Real network (with id) + explicit frame flag → NetworkNode renders
        // it as a frame while references resolve to the real network id.
        data: { network, frame: true },
      };
      const childRef = { networkId: network.id, name: network.name };
      const childIds = new Set(childResources.map((r) => `resource-${r.id}`));

      reactFlow.setNodes((prev) => {
        const alreadyPresent = new Set(prev.map((n) => n.id));
        // Everything that belongs inside the frame: the network's API
        // resources already on the canvas, plus standalone DRAFT resources
        // the user assigned to this network via the picker before the frame
        // existed (their draftNetwork ref points at this network id).
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
        // A resource of this network already on the canvas (dropped standalone)
        // must be REPARENTED into the frame, not duplicated — same node id.
        const reparent = (n: Node, index: number): Node => ({
          ...n,
          parentId: frameNodeId,
          position: getFrameChildPosition(index),
          style: { ...n.style, width: NETWORK_FRAME_CHILD_WIDTH },
          data: { ...n.data, draftNetwork: childRef },
        });
        // Fresh child nodes for resources not yet on the canvas.
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

        // Rebuild the array with the frame BEFORE its children (ReactFlow
        // requires parents to precede children): keep unrelated nodes, then
        // frame, then all its children (reparented existing + new).
        let idx = 0;
        const others = prev.filter((n) => !allChildIds.has(n.id));
        const reparented = prev
          .filter((n) => allChildIds.has(n.id))
          .map((n) => reparent(n, idx++));
        newChildren.forEach((n) => (n.position = getFrameChildPosition(idx++)));
        // idx = total children — adopted draft resources grow the frame too.
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

  // Kept for callers that still switch on kind (components panel templates,
  // context menu).
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
