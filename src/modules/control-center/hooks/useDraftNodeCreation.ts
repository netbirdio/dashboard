import { useCallback } from "react";
import { Node, XYPosition, useReactFlow } from "@xyflow/react";
import { NodeType } from "@/modules/control-center/utils/nodes";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { PLACEHOLDER_BASE_NAMES } from "@/modules/control-center/utils/helpers";
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

// Creating draft nodes (peer placeholders, blank policies/networks/resources)
// — shared by the components picker (drop) and the canvas context menu
// (click/shortcut).
export function useDraftNodeCreation() {
  const reactFlow = useReactFlow();
  const { policies } = useControlCenterData();

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
      placeNode(
        {
          id: `peer-draft-${uid()}`,
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
    },
    [placeNode, reactFlow],
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

  // Blank, id-less nodes (render their NEW badge); visual placeholders only.
  const addBlankNode = useCallback(
    (kind: "network" | "resource", position?: XYPosition) => {
      const node: Node =
        kind === "resource"
          ? {
              id: `resource-new-${uid()}`,
              type: NodeType.ResourceNode,
              position: { x: 0, y: 0 },
              data: {
                resource: { name: "New Resource" },
                enabled: true,
                showHandles: true,
              },
            }
          : {
              id: `network-new-${uid()}`,
              type: NodeType.NetworkNode,
              position: { x: 0, y: 0 },
              data: { network: { name: "New Network", resources: [] } },
            };
      placeNode(node, position);
    },
    [placeNode],
  );

  return {
    placeNode,
    addPeerPlaceholder,
    addBlankNode,
    addBlankPolicy,
  };
}
