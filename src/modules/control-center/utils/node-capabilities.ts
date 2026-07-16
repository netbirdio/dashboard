import { Node } from "@xyflow/react";
import {
  getDraftResource,
  getPlaceholderPeer,
  isCompleteDraftResource,
} from "@/modules/control-center/utils/helpers";

// Capability predicates for canvas nodes — the single place that answers
// "what can this node do in draft mode". Wired into the node context menu
// and drag-to-group; node-capabilities.test.ts documents the full matrix.

// A placeholder that hasn't materialized yet (Server / Agent / User Device
// without a chosen peer). A user-device select node that picked a peer IS
// that peer and stops being a placeholder.
export const isPlaceholderPeerNode = (node?: Node) =>
  !!getPlaceholderPeer(node);

// Placeholders carry a canvas-only name (Rename in the context menu) and an
// Install button; real peers get their name from the machine.
export const canRenamePeerNode = isPlaceholderPeerNode;
export const canInstallPeerNode = isPlaceholderPeerNode;

// Only the User Device variant offers the peer-select dropdown — kept after
// a peer is chosen so the selection can be switched.
export const canSelectPeer = (node?: Node) =>
  (node?.data as { placeholderKind?: string })?.placeholderKind ===
  "user-device";

// Node types that can be dragged into a group.
export const DROPPABLE_INTO_GROUP_NODE_TYPES = new Set([
  "peerNode",
  "sourcePeerNode",
  "expandedGroupPeer",
  "resourceNode",
  "destinationResourceNode",
]);

// The entity id that would join a group when this node is dropped onto one:
// real peer id, placeholder draft id, or resource id — undefined when the
// node can't join a group (groups, policies, blank id-less resources).
export const getGroupableEntityId = (node?: Node): string | undefined => {
  if (!node || !DROPPABLE_INTO_GROUP_NODE_TYPES.has(node.type ?? "")) {
    return undefined;
  }
  const data = node.data as {
    peer?: { id?: string };
    resource?: { id?: string };
  };
  return (
    data?.peer?.id ??
    getPlaceholderPeer(node)?.id ??
    data?.resource?.id ??
    // Complete draft resources join with their "new-…" ids; incomplete ones
    // can't — their data lives on the node, which leaves the canvas on drop.
    (isCompleteDraftResource(node) ? getDraftResource(node)?.id : undefined)
  );
};

// What can act as a routing peer for a network: real peers, placeholder
// peers, and groups — never resources, networks, or policies.
const PEER_TYPES = new Set(["peerNode", "sourcePeerNode", "expandedGroupPeer"]);
const GROUP_TYPES = new Set([
  "groupNode",
  "sourceGroupNode",
  "destinationGroupNode",
]);
export const canBeRoutingPeer = (node?: Node) =>
  !!node && (PEER_TYPES.has(node.type ?? "") || GROUP_TYPES.has(node.type ?? ""));

// Only draft resources can be (re-)assigned to a network on the canvas —
// existing resources aren't mutated in v1.
export const canAssignToNetwork = (node?: Node) =>
  !!node?.id.startsWith("resource-new-");

// Draft-created entities are editable on the canvas; existing ones are
// read-only references in v1.
export const canConfigureResource = canAssignToNetwork;
export const canRenameNetworkNode = (node?: Node) =>
  node?.type === "networkNode" &&
  !(node.data as { network?: { id?: string } })?.network?.id;
