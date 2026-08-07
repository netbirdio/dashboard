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

// The one Remove implementation shared by the context menu's "Remove" items
// and the Delete/Backspace keys: Remove is canvas-only and never confirms,
// but it still has to keep the changeset honest (cancel pending creates,
// record the disconnect of an existing policy, clear group refs, …) — which
// React Flow's raw node deletion would silently skip.
export function useNodeRemoval() {
  const { removeGroup, removeNodeWithEdges } = useDraftGroupActions();
  const { trackDeletePolicy, trackUpdatePolicy } = useDraftChangeset();

  // Remove a policy from the CANVAS (no confirm, nothing deleted): the
  // policy node and its edges go away; its source and destination nodes STAY
  // on the canvas. A draft-created policy drops its pending create, an
  // existing policy records an update-policy change with emptied sides
  // (superseding any pending update/toggle) so the disconnect deploys.
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

  // Mirrors the context menu: every draft node offers Remove EXCEPT an
  // existing framed resource (Delete only — it can't silently detach from
  // its network) and the live-view selector nodes.
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
