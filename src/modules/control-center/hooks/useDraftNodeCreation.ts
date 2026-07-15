import { useCallback } from "react";
import { Node, XYPosition, useReactFlow } from "@xyflow/react";
import { NodeType } from "@/modules/control-center/utils/nodes";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import type { PeerPlaceholderKind } from "@/modules/control-center/nodes/PeerNode";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Creating draft nodes (peer placeholders, blank networks/resources) — shared
// by the components picker (drop) and the canvas context menu (click/shortcut).
export function useDraftNodeCreation() {
  const reactFlow = useReactFlow();
  const { setInstallModal } = useDraftMode();

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
          id: `peer-new-${uid()}`,
          type: NodeType.PeerNode,
          position: { x: 0, y: 0 },
          data: {
            placeholderKind: kind,
            showHandles: true,
            enabled: true,
          },
        },
        position,
      );
    },
    [placeNode],
  );

  const addUserDevice = useCallback(() => {
    setInstallModal({ isUserDevice: true });
  }, [setInstallModal]);

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

  return { placeNode, addPeerPlaceholder, addUserDevice, addBlankNode };
}
