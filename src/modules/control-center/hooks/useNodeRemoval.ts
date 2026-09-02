import { useCallback } from "react";
import { Node } from "@xyflow/react";
import { Policy } from "@/interfaces/Policy";
import { NodeType } from "@/modules/control-center/utils/nodes";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";

const GROUP_NODE_TYPES = new Set<string>([
  NodeType.GroupNode,
  NodeType.SourceGroupNode,
  NodeType.DestinationGroupNode,
]);

// Remove never confirms, but it still keeps the changeset honest — React Flow's
// raw node deletion would skip the policy strips.
export function useNodeRemoval() {
  const { removeGroups, removeNodeWithEdges } = useDraftGroupActions();
  const { trackDeletePolicy } = useDraftChangeset();

  // Off the canvas a policy authorizes nothing, so it deploys as a deletion.
  const removePolicyFromCanvas = useCallback(
    (node: Node) => {
      const nodePolicy = node.data?.policy as Policy | undefined;
      if (!nodePolicy) return;

      trackDeletePolicy({
        policyId: node.id.replace("policy-", ""),
        name: nodePolicy.name ?? "Policy",
      });
      removeNodeWithEdges(node.id);
    },
    [trackDeletePolicy, removeNodeWithEdges],
  );

  // Remove is withheld where taking the node off the canvas amounts to deleting
  // the entity itself — those get Delete, which confirms.
  const canRemoveNode = useCallback((node: Node) => {
    if (
      node.type === NodeType.SelectPeerNode ||
      node.type === NodeType.SelectGroupNode ||
      node.type === NodeType.SelectUserNode
    ) {
      return false;
    }
    if (node.type === NodeType.PolicyNode) {
      return node.id.startsWith("policy-new-");
    }
    if (node.type === NodeType.ResourceNode) {
      const isDraftResource = node.id.startsWith("resource-new-");
      const isFramed = !!node.parentId;
      return isDraftResource || !isFramed;
    }
    return true;
  }, []);

  // Group nodes go through removeGroups as ONE batch: per-node calls each read the
  // same pre-removal store, so only the last policy strip would survive.
  const removeNodes = useCallback(
    (nodes: Node[]) => {
      const removable = nodes.filter(canRemoveNode);
      removeGroups(removable.filter((n) => GROUP_NODE_TYPES.has(n.type ?? "")));
      removable.forEach((node) => {
        if (GROUP_NODE_TYPES.has(node.type ?? "")) return;
        if (node.type === NodeType.PolicyNode) {
          removePolicyFromCanvas(node);
          return;
        }
        removeNodeWithEdges(node.id);
      });
    },
    [canRemoveNode, removeGroups, removePolicyFromCanvas, removeNodeWithEdges],
  );

  const removeNode = useCallback(
    (node: Node) => removeNodes([node]),
    [removeNodes],
  );

  return { removeNode, removeNodes, canRemoveNode, removePolicyFromCanvas };
}
