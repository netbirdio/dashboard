import { Node } from "@xyflow/react";
import {
  getDraftResource,
  getPlaceholderPeer,
} from "@/modules/control-center/utils/helpers";

// Capability predicates for canvas nodes: the single place that answers what a
// node can do in draft mode. node-capabilities.test.ts documents the matrix.

// A user-device select node that picked a peer IS that peer and stops being a
// placeholder.
export const isPlaceholderPeerNode = (node?: Node) =>
  !!getPlaceholderPeer(node);

// Real peers take their name from the machine; only placeholders are renamed.
export const canRenamePeerNode = isPlaceholderPeerNode;
export const canInstallPeerNode = isPlaceholderPeerNode;

// Kept after a peer is chosen so the selection can be switched.
export const canSelectPeer = (node?: Node) =>
  (node?.data as { placeholderKind?: string })?.placeholderKind ===
  "user-device";

export const DROPPABLE_INTO_GROUP_NODE_TYPES = new Set([
  "peerNode",
  "sourcePeerNode",
  "expandedGroupPeer",
  "resourceNode",
  "destinationResourceNode",
]);

// Undefined when the node can't join a group (groups, policies, id-less
// resources).
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
    // Draft resources join with their "new-…" ids even without a network yet;
    // the group panel shows them as "No Network" until assigned.
    getDraftResource(node)?.id
  );
};

const PEER_TYPES = new Set(["peerNode", "sourcePeerNode", "expandedGroupPeer"]);
const GROUP_TYPES = new Set([
  "groupNode",
  "sourceGroupNode",
  "destinationGroupNode",
]);
export const canBeRoutingPeer = (node?: Node) =>
  !!node && (PEER_TYPES.has(node.type ?? "") || GROUP_TYPES.has(node.type ?? ""));

// Existing resources aren't mutated in v1.
export const canAssignToNetwork = (node?: Node) =>
  !!node?.id.startsWith("resource-new-");

export const canConfigureResource = canAssignToNetwork;
export const canRenameNetworkNode = (node?: Node) =>
  node?.type === "networkNode" &&
  !(node.data as { network?: { id?: string } })?.network?.id;
