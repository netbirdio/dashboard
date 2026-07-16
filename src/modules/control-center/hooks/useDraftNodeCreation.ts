import { useCallback } from "react";
import { Node, XYPosition, useReactFlow } from "@xyflow/react";
import { NodeType } from "@/modules/control-center/utils/nodes";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  makeRouterEdge,
  PLACEHOLDER_BASE_NAMES,
} from "@/modules/control-center/utils/helpers";
import type { PeerPlaceholderKind } from "@/modules/control-center/nodes/PeerNode";
import type { Policy } from "@/interfaces/Policy";

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
  const { setResourceEditor, setInstallModal } = useDraftMode();
  const { trackCreateNetwork } = useDraftChangeset();

  // Places a node roughly centered under the given flow position.
  const placeNode = useCallback(
    (node: Node, position?: XYPosition) => {
      const pos = position
        ? { x: position.x - 100, y: position.y - 30 }
        : { x: 0, y: 0 };
      reactFlow.setNodes((prev) => prev.concat({ ...node, position: pos }));
    },
    [reactFlow],
  );

  // No setup key is created here — the key is generated inside the install
  // modal, only when the user actually installs.
  const addPeerPlaceholder = useCallback(
    (kind: PeerPlaceholderKind, position?: XYPosition) => {
      const nodeId = `peer-draft-${uid()}`;
      placeNode(
        {
          id: nodeId,
          type: NodeType.PeerNode,
          position: { x: 0, y: 0 },
          data: {
            placeholderKind: kind,
            placeholderName: getNextPlaceholderName(
              kind,
              reactFlow.getNodes(),
            ),
            showHandles: true,
            enabled: true,
          },
        },
        position,
      );
      return nodeId;
    },
    [placeNode, reactFlow],
  );

  // "Add Routing Peer" on a network node: drops a connected Server
  // placeholder next to the network and opens the setup-key install flow.
  // The create-router change is recorded once the placeholder installs (the
  // routing edge carries the intent until then — placeholder ids stay out of
  // the changeset).
  const addRoutingPeer = useCallback(
    (networkNodeId: string) => {
      const networkNode = reactFlow
        .getNodes()
        .find((n) => n.id === networkNodeId);
      if (!networkNode) return;
      const peerNodeId = addPeerPlaceholder("server", {
        x: networkNode.position.x - 260,
        y: networkNode.position.y + 60,
      });
      reactFlow.setEdges((prev) =>
        prev.concat(makeRouterEdge(peerNodeId, networkNodeId)),
      );
      setInstallModal({
        isUserDevice: false,
        placeholderKind: "server",
        nodeId: peerNodeId,
      });
    },
    [reactFlow, addPeerPlaceholder, setInstallModal],
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
    (position?: XYPosition) => {
      const taken = new Set<string>();
      networks?.forEach((n) => n.name && taken.add(n.name));
      reactFlow.getNodes().forEach((n) => {
        const name = (n.data as { network?: { name?: string } })?.network
          ?.name;
        if (name) taken.add(name);
      });
      const name = getNextUniqueName("New Network", taken);
      const nodeId = `network-new-${uid()}`;
      placeNode(
        {
          id: nodeId,
          type: NodeType.NetworkNode,
          position: { x: 0, y: 0 },
          data: { network: { name, resources: [] } },
        },
        position,
      );
      trackCreateNetwork({ clientId: nodeId.replace("network-", ""), name });
      return nodeId;
    },
    [placeNode, reactFlow, networks, trackCreateNetwork],
  );

  // Drops a draft resource and opens the editor right away — a bare resource
  // isn't deployable (needs address + network), so the editor front-loads
  // the required fields. Cancelling keeps the node as an incomplete
  // placeholder with a "Set up" affordance.
  const addDraftResource = useCallback(
    (position?: XYPosition) => {
      const taken = new Set<string>();
      networkResources?.forEach((r) => r.name && taken.add(r.name));
      reactFlow.getNodes().forEach((n) => {
        const name = (n.data as { resource?: { name?: string } })?.resource
          ?.name;
        if (name) taken.add(name);
      });
      const name = getNextUniqueName("New Resource", taken);
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
      setResourceEditor({ nodeId });
      return nodeId;
    },
    [placeNode, reactFlow, networkResources, setResourceEditor],
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
    addRoutingPeer,
    addBlankNode,
    addDraftNetwork,
    addDraftResource,
    addBlankPolicy,
  };
}
