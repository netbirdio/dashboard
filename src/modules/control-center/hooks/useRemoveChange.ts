import { Node } from "@xyflow/react";
import { useCallback } from "react";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import {
  DraftChange,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";
import {
  CascadePreview,
  clearPolicyResourceRef,
  isPendingPolicyWrite,
  pendingGroupDeletionWrite,
  pendingPolicyView,
  pendingResourceViews,
  policyGroupIds,
  previewRemoveChange,
  reduceRemoveChange,
  stripDraftGroupFromPolicy,
} from "@/modules/control-center/utils/change-cascade";
import {
  buildGroupNode,
  buildNetworkFrame,
  buildStandaloneResourceNode,
} from "@/modules/control-center/utils/draft-node-factory";

const policyNamesDraftGroup = (policy: Policy, name: string) =>
  !!policy.rules?.some((r) =>
    [r.sources, r.destinations].some(
      (side) =>
        Array.isArray(side) &&
        (side as (Group | string)[]).some(
          (g) => typeof g !== "string" && !g.id && g.name === name,
        ),
    ),
  );

const policyRefsResource = (policy: Policy, refId: string) =>
  !!policy.rules?.some(
    (r) =>
      r.sourceResource?.id === refId || r.destinationResource?.id === refId,
  );

/** Reverts the draft as if the removed change had never happened. */
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

  // ensureDraftGroupChanges re-tracks id-less groups in node data, so a discarded
  // entity must leave data.policy too; `patch` returns the SAME policy to skip a node.
  const patchPolicyNodeData = useCallback(
    (patch: (policy: Policy) => Policy) => {
      setNodes((prev) =>
        prev.map((n) => {
          const policy = (n.data as any)?.policy as Policy | undefined;
          if (!policy) return n;
          const patched = patch(policy);
          return patched === policy
            ? n
            : { ...n, data: { ...(n.data as any), policy: patched } };
        }),
      );
    },
    [setNodes],
  );

  const livePoliciesReferencing = useCallback(
    (pred: (p: NonNullable<typeof policies>[number]) => boolean) =>
      (policies ?? []).filter(pred),
    [policies],
  );

  // Live is the fallback, never the default: a policy the USER marked for deletion
  // must not come back from live while its delete-policy stands.
  const redrawPolicies = useCallback(
    (refs: Policy[], pending: DraftChange[]) => {
      refs.forEach((p) => {
        const write = pending.find(
          (c) => isPendingPolicyWrite(c) && c.policyId === p.id,
        );
        const view = pendingPolicyView(write);
        if (!view && write) return;
        drawPolicyOnCanvas(view ?? p);
      });
    },
    [drawPolicyOnCanvas],
  );

  const removeWithCascade = useCallback(
    (change: DraftChange) => {
      // removeNodeWithEdges owns the canvas half, absorbed placeholders included.
      if (change.type === "install-peer") {
        if (change.installedPeerId) {
          replaceChanges(changes.filter((c) => c.id !== change.id));
          return;
        }
        removeNodeWithEdges(`peer-${change.clientId}`);
        return;
      }

      const next = reduceRemoveChange(changes, change);
      replaceChanges(next);

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
          patchPolicyNodeData((p) =>
            policyNamesDraftGroup(p, change.name)
              ? stripDraftGroupFromPolicy(p, change.name)
              : p,
          );
          return;
        }
        case "create-policy":
          dropNodes(new Set([`policy-${change.clientId}`]));
          return;
        case "create-resource":
          dropNodes(new Set([`resource-${change.clientId}`]));
          patchPolicyNodeData((p) =>
            policyRefsResource(p, change.clientId)
              ? clearPolicyResourceRef(p, change.clientId)
              : p,
          );
          return;
        case "create-network": {
          const frameId = `network-${change.clientId}`;
          setNodes((prev) => {
            const frame = prev.find((n) => n.id === frameId);
            return prev
              .filter((n) => n.id !== frameId)
              .map((n) => {
                const dn = (n.data as any)?.draftNetwork;
                const isChild = n.parentId === frameId;
                const refsFrame = dn?.networkClientId === change.clientId;
                if (!isChild && !refsFrame) return n;
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
                  // A child's position is frame-relative; detached, React Flow
                  // reads it as absolute, so the frame's offset folds in.
                  ...(isChild && frame
                    ? {
                        position: {
                          x: n.position.x + frame.position.x,
                          y: n.position.y + frame.position.y,
                        },
                      }
                    : {}),
                } as Node;
              });
          });
          return;
        }
        // create-router has no canvas half: routers are changeset-only, so the
        // frame's routing-peer count follows from dropping the change.

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
                      // Drop the draft overlays so the node reads live again —
                      // including the captured baseline, which `resource` now is.
                      resourceEnabled: undefined,
                      resourceGroupIds: undefined,
                      liveResource: undefined,
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
          if (!live) return;
          // Restoring the policy revives groups a `delete-group` still names, whose
          // DELETE the API refuses — so the strip is re-recorded under the same id.
          const owed = pendingGroupDeletionWrite(next, live, change.id);
          if (owed) {
            replaceChanges([...next, owed]);
            drawPolicyOnCanvas(pendingPolicyView(owed) ?? live);
            return;
          }
          drawPolicyOnCanvas(live);
          return;
        }
        case "delete-group": {
          const live = groups?.find((g) => g.id === change.groupId);
          if (!live) return;
          const refs = livePoliciesReferencing((p) =>
            policyGroupIds(p).includes(change.groupId),
          );
          redrawPolicies(refs, next);
          // Draft policies have no live twin to redraw from, so they come off the
          // restored create-policy change.
          const draftRefs = next.filter(
            (c) =>
              c.type === "create-policy" &&
              policyGroupIds(c.policy).includes(change.groupId),
          );
          draftRefs.forEach(
            (c) => c.type === "create-policy" && drawPolicyOnCanvas(c.policy),
          );
          // Neither pass drew it, so the group comes back on its own.
          if (
            refs.length === 0 &&
            draftRefs.length === 0 &&
            !nodes.some((n) => n.id === `group-${change.groupId}`)
          ) {
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
          redrawPolicies(refs, next);
          return;
        }
        case "delete-network": {
          const live = networks?.find((nw) => nw.id === change.networkId);
          if (!live || nodes.some((n) => n.id === `network-${change.networkId}`))
            return;
          // Rows are built from what the changeset says about children, not live alone;
          // filtered before the build, or the grid stays sized for rows it never gets.
          const { frame, children } = buildNetworkFrame(
            live,
            pendingResourceViews(networkResources, next),
            policies,
          );
          const edited = new Set(
            next.flatMap((c) =>
              c.type === "update-resource" ? [c.resourceId] : [],
            ),
          );
          setNodes((prev) => [
            ...prev,
            frame,
            // A patched row is not live, so the true live copy rides along as the revert
            // baseline — `withResourceLiveBaseline` would otherwise stash the patch.
            ...children.map((c) => {
              const rid = (c.data as { resource?: { id?: string } })?.resource
                ?.id;
              if (!rid || !edited.has(rid)) return c;
              return {
                ...c,
                data: {
                  ...c.data,
                  liveResource: networkResources?.find((r) => r.id === rid),
                },
              };
            }),
          ]);
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
      patchPolicyNodeData,
      setNodes,
      groups,
      networks,
      networkResources,
      policies,
      drawPolicyOnCanvas,
      livePoliciesReferencing,
      redrawPolicies,
      removeNodeWithEdges,
    ],
  );

  return { removeWithCascade, previewRemove };
}
