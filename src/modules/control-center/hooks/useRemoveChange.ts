import { useCallback } from "react";
import { Edge, Node } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";
import {
  DraftChange,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import {
  CascadePreview,
  previewRemoveChange,
  reduceRemoveChange,
} from "@/modules/control-center/utils/change-cascade";
import {
  buildGroupNode,
  buildNetworkFrame,
  buildStandaloneResourceNode,
} from "@/modules/control-center/utils/draft-node-factory";

/**
 * Removing a changeset entry reverts the draft as if that change had never
 * happened, cascading to BOTH the canvas and the dependent changes. The
 * changeset outcome is the pure reduceRemoveChange (tested); this hook applies
 * the matching canvas mutation per change type:
 *   - create-X  → remove the node(s)/edges (network detaches its resources).
 *   - update-X  → patch the node's data back to the live values.
 *   - delete-X  → restore the node(s) from live (drawPolicyOnCanvas re-adds
 *                 policy-attached endpoints; the node factory rebuilds frames).
 *   - install-peer → delegate to removeNodeWithEdges (it also sweeps the
 *                 placeholder's setup-key / bound-group artifacts).
 */
export function useRemoveChange() {
  const { nodes, edges, setNodes, setEdges } = useCanvasState();
  const { changes, replaceChanges } = useDraftChangeset();
  const { groups, networks, networkResources, policies } =
    useControlCenterData();
  const { drawPolicyOnCanvas } = useControlCenterPolicy();
  const { removeNodeWithEdges } = useDraftGroupActions();

  const previewRemove = useCallback(
    (change: DraftChange): CascadePreview =>
      previewRemoveChange(change, changes, nodes, edges),
    [changes, nodes, edges],
  );

  // Drop a set of node ids (and any of their frame children) + every edge that
  // touches them.
  const dropNodes = useCallback(
    (ids: Set<string>) => {
      setNodes((prev) =>
        prev.filter((n) => !ids.has(n.id) && !(n.parentId && ids.has(n.parentId))),
      );
      setEdges((prev) =>
        prev.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
      );
    },
    [setNodes, setEdges],
  );

  // Policies (live) that reference an entity id in a group/resource slot.
  const livePoliciesReferencing = useCallback(
    (pred: (p: NonNullable<typeof policies>[number]) => boolean) =>
      (policies ?? []).filter(pred),
    [policies],
  );

  const removeWithCascade = useCallback(
    (change: DraftChange) => {
      // install-peer: the canvas hook also deletes the generated setup key and
      // bound group, so use it wholesale (it updates the changeset too).
      if (change.type === "install-peer") {
        removeNodeWithEdges(`peer-${change.clientId}`);
        return;
      }

      // Changeset: fully specified + tested.
      replaceChanges(reduceRemoveChange(changes, change));

      // Canvas: per type.
      switch (change.type) {
        case "create-group": {
          const ids = new Set(
            nodes
              .filter(
                (n) =>
                  n.id === change.clientId ||
                  (!!(n.data as any)?.group &&
                    (n.data as any).group.name === change.name &&
                    !(n.data as any).group.id),
              )
              .map((n) => n.id),
          );
          dropNodes(ids);
          return;
        }
        case "create-policy":
          dropNodes(new Set([`policy-${change.clientId}`]));
          return;
        case "create-resource":
          dropNodes(new Set([`resource-${change.clientId}`]));
          return;
        case "create-network": {
          const frameId = `network-${change.clientId}`;
          setNodes((prev) =>
            prev
              .filter((n) => n.id !== frameId)
              .map((n) => {
                const dn = (n.data as any)?.draftNetwork;
                const isChild = n.parentId === frameId;
                const refsFrame = dn?.networkClientId === change.clientId;
                if (!isChild && !refsFrame) return n;
                // Detach to standalone: drop the frame parenting + network ref.
                const { draftNetwork, ...restData } = (n.data as any) ?? {};
                const { width, height, ...restStyle } = (n.style as any) ?? {};
                return {
                  ...n,
                  parentId: undefined,
                  extent: undefined,
                  hidden: false,
                  selectable: true,
                  style: restStyle,
                  data: restData,
                } as Node;
              }),
          );
          // Drop routing edges into the removed frame.
          setEdges((prev) =>
            prev.filter(
              (e) => !((e.data as any)?.router && e.target === frameId),
            ),
          );
          return;
        }
        case "create-router": {
          const netId = change.networkId ?? change.networkClientId;
          const frameId = `network-${netId}`;
          // A draft group's router edge id isn't peer-scoped — match by target.
          const src = change.peerId
            ? `peer-${change.peerId}`
            : change.groupId
            ? undefined
            : undefined;
          setEdges((prev) =>
            prev.filter(
              (e) =>
                !(
                  (e.data as any)?.router &&
                  e.target === frameId &&
                  (src ? e.source === src : true)
                ),
            ),
          );
          return;
        }

        // ── update-X → revert node data to live ──
        case "update-group": {
          const live = groups?.find((g) => g.id === change.groupId);
          if (!live) return;
          setNodes((prev) =>
            prev.map((n) =>
              (n.data as any)?.group?.id === change.groupId
                ? { ...n, data: { ...(n.data as any), group: live, addedMembers: undefined } }
                : n,
            ),
          );
          return;
        }
        case "update-network": {
          const live = networks?.find((nw) => nw.id === change.networkId);
          if (!live) return;
          setNodes((prev) =>
            prev.map((n) =>
              n.id === `network-${change.networkId}`
                ? { ...n, data: { ...(n.data as any), network: live } }
                : n,
            ),
          );
          return;
        }
        case "update-resource": {
          const live = networkResources?.find(
            (r) => r.id === change.resourceId,
          );
          if (!live) return;
          setNodes((prev) =>
            prev.map((n) =>
              (n.data as any)?.resource?.id === change.resourceId
                ? {
                    ...n,
                    data: {
                      ...(n.data as any),
                      resource: live,
                      enabled: live.enabled ?? true,
                    },
                  }
                : n,
            ),
          );
          return;
        }
        case "update-policy":
        case "delete-policy": {
          const live = policies?.find((p) => p.id === change.policyId);
          if (live) drawPolicyOnCanvas(live);
          return;
        }
        case "delete-group": {
          const live = groups?.find((g) => g.id === change.groupId);
          if (!live) return;
          const refs = livePoliciesReferencing((p) =>
            (p.rules?.[0]
              ? [
                  ...((p.rules[0].sources as any[]) ?? []),
                  ...((p.rules[0].destinations as any[]) ?? []),
                ]
              : []
            ).some((g) => (typeof g === "string" ? g : g?.id) === change.groupId),
          );
          if (refs.length) {
            refs.forEach((p) => drawPolicyOnCanvas(p));
          } else if (!nodes.some((n) => n.id === `group-${change.groupId}`)) {
            setNodes((prev) => [...prev, buildGroupNode(live)]);
          }
          return;
        }
        case "delete-resource": {
          const live = networkResources?.find(
            (r) => r.id === change.resourceId,
          );
          const net = networks?.find((nw) => nw.id === change.networkId);
          if (live && net && !nodes.some((n) => n.id === `resource-${live.id}`)) {
            setNodes((prev) => [...prev, buildStandaloneResourceNode(live, net)]);
          }
          const refs = livePoliciesReferencing((p) =>
            p.rules?.[0]?.destinationResource?.id === change.resourceId ||
            p.rules?.[0]?.sourceResource?.id === change.resourceId,
          );
          refs.forEach((p) => drawPolicyOnCanvas(p));
          return;
        }
        case "delete-network": {
          const live = networks?.find((nw) => nw.id === change.networkId);
          if (!live || nodes.some((n) => n.id === `network-${change.networkId}`))
            return;
          const { frame, children } = buildNetworkFrame(
            live,
            networkResources,
            policies,
          );
          setNodes((prev) => [...prev, frame, ...children]);
          return;
        }
        default:
          return;
      }
    },
    [
      changes,
      nodes,
      replaceChanges,
      dropNodes,
      setNodes,
      setEdges,
      groups,
      networks,
      networkResources,
      policies,
      drawPolicyOnCanvas,
      livePoliciesReferencing,
      removeNodeWithEdges,
    ],
  );

  return { removeWithCascade, previewRemove };
}
