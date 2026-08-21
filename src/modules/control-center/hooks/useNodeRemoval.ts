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

// Remove is canvas-only and never confirms, but it still has to keep the
// changeset honest, which React Flow's raw node deletion would skip.
export function useNodeRemoval() {
  const { removeGroup, removeNodeWithEdges } = useDraftGroupActions();
  const { trackDeletePolicy, trackUpdatePolicy } = useDraftChangeset();

  // A draft-created policy drops its pending create; an existing policy records
  // an update-policy with emptied sides so the disconnect deploys.
  const removePolicyFromCanvas = useCallback(
    (node: Node) => {
      const nodePolicy = node.data?.policy as Policy | undefined;
      if (!nodePolicy) return;
      const policyClientId = node.id.replace("policy-", "");

      if (node.id.startsWith("policy-new-")) {
        trackDeletePolicy({
          policyId: policyClientId,
          name: nodePolicy.name ?? "Policy",
        });
      } else {
        const rule = nodePolicy.rules?.[0];
        trackUpdatePolicy({
          policyId: policyClientId,
          policy: {
            ...nodePolicy,
            rules: rule
              ? [
                  {
                    ...rule,
                    sources: [],
                    destinations: [],
                    sourceResource: undefined,
                    destinationResource: undefined,
                  },
                  ...(nodePolicy.rules?.slice(1) ?? []),
                ]
              : nodePolicy.rules,
          },
        });
      }

      removeNodeWithEdges(node.id);
    },
    [trackDeletePolicy, trackUpdatePolicy, removeNodeWithEdges],
  );

  // Every draft node offers Remove EXCEPT an existing framed resource (Delete
  // only, it can't silently detach from its network) and the selector nodes.
  const canRemoveNode = useCallback((node: Node) => {
    if (
      node.type === NodeType.SelectPeerNode ||
      node.type === NodeType.SelectGroupNode ||
      node.type === NodeType.SelectUserNode
    ) {
      return false;
    }
    if (node.type === NodeType.ResourceNode) {
      const isDraftResource = node.id.startsWith("resource-new-");
      const isFramed = !!node.parentId;
      return isDraftResource || !isFramed;
    }
    return true;
  }, []);

  const removeNode = useCallback(
    (node: Node) => {
      if (!canRemoveNode(node)) return;
      if (GROUP_NODE_TYPES.has(node.type ?? "")) {
        removeGroup(node);
        return;
      }
      if (node.type === NodeType.PolicyNode) {
        removePolicyFromCanvas(node);
        return;
      }
      removeNodeWithEdges(node.id);
    },
    [canRemoveNode, removeGroup, removePolicyFromCanvas, removeNodeWithEdges],
  );

  return { removeNode, canRemoveNode, removePolicyFromCanvas };
}
