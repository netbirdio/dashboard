import { Edge, Node, useReactFlow,XYPosition } from "@xyflow/react";
import { useCallback } from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { Group, GroupIssued } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { usePlaceholderArtifacts } from "@/modules/control-center/hooks/usePlaceholderArtifacts";
import {
  deletedGroupRefs,
  isPendingPolicyWrite,
  pendingPolicyView,
} from "@/modules/control-center/utils/change-cascade";
import {
  draftUid,
  dropAbsorbedPlaceholder,
  findPlaceholderHolder,
  getTopZIndex,
  isDraftNetworkNode,
  isFrameNode,
} from "@/modules/control-center/utils/helpers";
import { NodeType } from "@/modules/control-center/utils/nodes";
import {
  groupDeletionPolicyUpdates,
  patchGroupInPolicies,
  sameGroupMatcher,
} from "@/modules/control-center/utils/policy-group-sync";

export const GROUP_NODE_TYPES = new Set([
  "groupNode",
  "sourceGroupNode",
  "destinationGroupNode",
]);

export const isGroupNode = (node?: Node) =>
  GROUP_NODE_TYPES.has(node?.type ?? "");

export const getNodeGroup = (node?: Node): Group | undefined =>
  node?.data?.group as Group | undefined;

export const isNewGroup = (group?: Group) => !!group && !group.id;

export const isAllGroup = (group?: Group) => group?.name === "All";

// JWT / IdP-issued groups can't be renamed via the API; "All" never can.
export const canRenameGroup = (group?: Group) =>
  !!group &&
  !isAllGroup(group) &&
  (isNewGroup(group) || !group.issued || group.issued === GroupIssued.API);

export const getNextNewGroupName = (taken: Set<string>) => {
  let name = "Group";
  let i = 2;
  while (taken.has(name)) name = `Group (${i++})`;
  return name;
};

// The edges decide which side a self-ref instance strips. Accumulating into
// `updatesById` lets a batch strip several groups from one policy without last-write-wins.
const collectGroupStrip = (
  allNodes: Node[],
  allEdges: Edge[],
  groupNode: Node,
  updatesById: Map<string, Policy>,
) => {
  const removedGroup = getNodeGroup(groupNode);
  if (!removedGroup) return;
  const gKey = removedGroup.id ?? removedGroup.name;
  const matchesGroup = (g: Group | string) =>
    (typeof g === "string" ? g : g.id ?? g.name) === gKey;
  allEdges.forEach((e) => {
    if (e.source !== groupNode.id && e.target !== groupNode.id) return;
    const isSourceSide = e.source === groupNode.id;
    const policyNodeId = isSourceSide ? e.target : e.source;
    const policyNode = allNodes.find((n) => n.id === policyNodeId);
    if (policyNode?.type !== NodeType.PolicyNode) return;
    const policy =
      updatesById.get(policyNodeId) ??
      ((policyNode.data as { policy?: Policy })?.policy as Policy);
    const rule = policy?.rules?.[0];
    if (!policy || !rule) return;
    const sources = (rule.sources ?? []) as (Group | string)[];
    const destinations = (rule.destinations ?? []) as (Group | string)[];
    const hit = isSourceSide
      ? sources.some(matchesGroup)
      : destinations.some(matchesGroup);
    if (!hit) return;
    updatesById.set(policyNodeId, {
      ...policy,
      rules: [
        {
          ...rule,
          sources: isSourceSide
            ? (sources.filter((g) => !matchesGroup(g)) as Group[])
            : rule.sources,
          destinations: !isSourceSide
            ? (destinations.filter((g) => !matchesGroup(g)) as Group[])
            : rule.destinations,
        },
        ...(policy.rules?.slice(1) ?? []),
      ],
    });
  });
};

// Every action here touches only the canvas and the changeset; the API runs on deploy.
export function useDraftGroupActions() {
  const reactFlow = useReactFlow();
  const { setNodes, setEdges, setSelectedDestinationGroup } = useCanvasState();
  const { groups, policies } = useControlCenterData();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const { confirm } = useDialog();
  const { registerArtifacts, revokeSetupKey } = usePlaceholderArtifacts();
  const {
    changes,
    trackCreateGroup,
    trackRenameGroup,
    trackDeleteGroup,
    trackUpdatePolicy,
    trackRemoveGroupMembers,
    removeGroupFromDraftResource,
    untrackNewGroup,
    untrackNetwork,
    untrackResource,
    untrackInstallPeer,
  } = useDraftChangeset();

  // The group panel opens on click, not on drop.
  const addNewGroup = useCallback(
    (position: XYPosition) => {
      const taken = new Set<string>();
      groups?.forEach((g) => taken.add(g.name));
      reactFlow
        .getNodes()
        .forEach((n) => getNodeGroup(n)?.name && taken.add(getNodeGroup(n)!.name));
      changes.forEach((c) => c.type === "create-group" && taken.add(c.name));

      const name = getNextNewGroupName(taken);
      const nodeId = `group-new-${draftUid()}`;
      setNodes((prev) =>
        prev.concat({
          id: nodeId,
          type: NodeType.GroupNode,
          position,
          zIndex: getTopZIndex(prev),
          data: {
            group: { name, peers_count: 0, resources_count: 0 },
            enabled: true,
            showHandles: true,
          },
        }),
      );
      trackCreateGroup({ clientId: nodeId, name });
      return nodeId;
    },
    [groups, changes, reactFlow, setNodes, trackCreateGroup],
  );

  // Policy nodes and edges hold their own group copies, so the rename must follow there.
  const renameGroup = useCallback(
    (node: Node, newName: string) => {
      const group = getNodeGroup(node);
      if (!group || group.name === newName) return;
      const from = group.name;
      const matches = (g: Group) =>
        group.id ? g.id === group.id : !g.id && g.name === from;
      const rename = (g: Group) => ({ ...g, name: newName });

      // Draft groups are also referenced BY NAME in resource nodes' `resourceGroupIds`
      // and in absorbed draft resources; a stale name there fails the deploy.
      const renameRef = (g: Group | string): Group | string =>
        typeof g === "string"
          ? g === from
            ? newName
            : g
          : !g.id && g.name === from
          ? { ...g, name: newName }
          : g;
      const renameNameRefs = (n: Node): Node => {
        if (group.id) return n;
        let next = n;
        const refs = (next.data as { resourceGroupIds?: string[] })
          ?.resourceGroupIds;
        if (refs?.includes(from)) {
          next = {
            ...next,
            data: {
              ...next.data,
              resourceGroupIds: refs.map((r) => renameRef(r) as string),
            },
          };
        }
        const held = (next.data as { draftResources?: NetworkResource[] })
          ?.draftResources;
        if (held?.some((r) => r.groups?.length)) {
          next = {
            ...next,
            data: {
              ...next.data,
              draftResources: held.map((r) =>
                r.groups?.length
                  ? ({
                      ...r,
                      groups: (r.groups as (Group | string)[]).map(renameRef),
                    } as NetworkResource)
                  : r,
              ),
            },
          };
        }
        return next;
      };

      setNodes((prev) =>
        patchGroupInPolicies(
          prev.map((raw) => {
            const n = renameNameRefs(raw);
            const g = getNodeGroup(n);
            if (!g || g.name !== from) return n;
            if (group.id ? g.id !== group.id : !!g.id) return n;
            return {
              ...n,
              data: { ...n.data, group: { ...g, name: newName } },
            };
          }),
          matches,
          rename,
        ),
      );
      setEdges((prev) => patchGroupInPolicies(prev, matches, rename));

      trackRenameGroup({ groupId: group.id, from, to: newName });
    },
    [setNodes, setEdges, trackRenameGroup],
  );

  // Draft-added members revert their addition; existing members are removed on deploy.
  const removeGroupMember = useCallback(
    (
      group: Group,
      member: { peerId?: string; resourceId?: string },
    ) => {
      const itemId = member.peerId ?? member.resourceId;
      if (!itemId) return;

      const dropCounts = (g: Group): Group => ({
        ...g,
        peers_count: member.peerId
          ? Math.max(0, (g.peers_count || 0) - 1)
          : g.peers_count,
        resources_count: member.resourceId
          ? Math.max(0, (g.resources_count || 0) - 1)
          : g.resources_count,
      });

      setNodes((prev) =>
        patchGroupInPolicies(
          prev.map((n) => {
            const g = getNodeGroup(n);
            if (!g) return n;
            const sameGroup = group.id
              ? g.id === group.id
              : !g.id && g.name === group.name;
            if (!sameGroup) return n;
            const addedMembers = new Set(
              (n.data.addedMembers as Set<string>) ?? [],
            );
            const removedMembers = new Set(
              (n.data.removedMembers as Set<string>) ?? [],
            );
            if (addedMembers.has(itemId)) addedMembers.delete(itemId);
            else removedMembers.add(itemId);
            return {
              ...n,
              data: {
                ...n.data,
                group: dropCounts(g),
                addedMembers,
                removedMembers,
              },
            };
          }),
          sameGroupMatcher(group),
          dropCounts,
        ),
      );
      setEdges((prev) =>
        patchGroupInPolicies(prev, sameGroupMatcher(group), dropCounts),
      );

      trackRemoveGroupMembers({
        groupId: group.id,
        groupName: group.name ?? "",
        peerIds: member.peerId ? [member.peerId] : [],
        resourceIds: member.resourceId ? [member.resourceId] : [],
      });

      // Draft resources also carry the group on their own create change.
      if (member.resourceId?.startsWith("new-")) {
        removeGroupFromDraftResource(
          member.resourceId,
          group.id ?? group.name,
        );
      }
    },
    [setNodes, setEdges, trackRemoveGroupMembers, removeGroupFromDraftResource],
  );

  const sweepAbsorbedPlaceholders = useCallback(
    (node?: Node) => {
      const held = (
        node?.data as
          | {
              draftPeers?: {
                id?: string;
                boundGroupId?: string;
                setupKeyId?: string;
              }[];
            }
          | undefined
      )?.draftPeers;
      const sweptIds: string[] = [];
      held?.forEach((p) => {
        if (!p?.id?.startsWith("draft-")) return;
        untrackInstallPeer(p.id);
        registerArtifacts(p.id, {
          boundGroupId: p.boundGroupId,
          setupKeyId: p.setupKeyId,
        });
        revokeSetupKey(p.setupKeyId);
        sweptIds.push(p.id);
      });
      // Netting the absorption's pending adds back out drops an otherwise-empty
      // "Modify" row; pendingOnly keeps a group DELETE from recording draft ids
      // as removed live members.
      const holderGroup = getNodeGroup(node);
      if (holderGroup && sweptIds.length > 0) {
        trackRemoveGroupMembers({
          groupId: holderGroup.id,
          groupName: holderGroup.name ?? "",
          peerIds: sweptIds,
          pendingOnly: true,
        });
      }
    },
    [
      untrackInstallPeer,
      registerArtifacts,
      revokeSetupKey,
      trackRemoveGroupMembers,
    ],
  );

  // Stripping a node out of a policy is a real pending change: updateDraftPolicy
  // records the update-policy alongside the canvas patch.
  const deferPolicyStrips = useCallback(
    (policyUpdates: Policy[]) => {
      if (policyUpdates.length === 0) return;
      // Next tick: the removal must hit the canvas before drawPolicyOnCanvas rebuilds edges.
      setTimeout(() => {
        const remaining = new Set(reactFlow.getNodes().map((n) => n.id));
        policyUpdates.forEach((p) => {
          if (!p.id || !remaining.has(`policy-${p.id}`)) return;
          updateDraftPolicy(p);
        });
      }, 0);
    },
    [reactFlow, updateDraftPolicy],
  );

  const removeNodeWithEdges = useCallback(
    (nodeId: string) => {
      // Removing a peer or resource also clears it from policies referencing it alone.
      const node = reactFlow.getNodes().find((n) => n.id === nodeId);
      const data = node?.data as
        | {
            peer?: { id?: string };
            resource?: { id?: string };
            placeholderKind?: string;
            boundGroupId?: string;
            setupKeyId?: string;
            draftPeers?: {
              id?: string;
              boundGroupId?: string;
              setupKeyId?: string;
            }[];
          }
        | undefined;
      const entityId =
        data?.peer?.id ??
        data?.resource?.id ??
        (data?.placeholderKind
          ? nodeId.replace("peer-", "")
          : nodeId.startsWith("resource-new-")
          ? nodeId.replace("resource-", "")
          : undefined);

      // Absorbed into a group, a placeholder has no node of its own; without this
      // the removal is a silent no-op that keeps blocking the deploy.
      if (!node && nodeId.startsWith("peer-draft-")) {
        const draftId = nodeId.replace("peer-", "");
        const holder = findPlaceholderHolder(reactFlow.getNodes(), draftId);
        if (!holder) {
          // Deleting the holding group orphans the change; it must stay removable
          // or its Install issue blocks the deploy with no way out.
          untrackInstallPeer(draftId);
          return;
        }
        const entry = (
          holder.data?.draftPeers as
            | { id?: string; boundGroupId?: string; setupKeyId?: string }[]
            | undefined
        )?.find((p) => p.id === draftId);
        untrackInstallPeer(draftId);
        registerArtifacts(draftId, {
          boundGroupId: entry?.boundGroupId,
          setupKeyId: entry?.setupKeyId,
        });
        revokeSetupKey(entry?.setupKeyId);
        const holderGroup = getNodeGroup(holder);
        if (holderGroup) {
          // A placeholder is only ever a pending add, never a live member.
          trackRemoveGroupMembers({
            groupId: holderGroup.id,
            groupName: holderGroup.name ?? "",
            peerIds: [draftId],
            pendingOnly: true,
          });
        }
        setNodes((prev) => dropAbsorbedPlaceholder(prev, draftId));
        return;
      }

      // Key and group are NOT deleted here — undo can bring the node back and the exit
      // flush owns them. The key IS revoked: left usable, a machine can still register.
      if (data?.placeholderKind && nodeId.startsWith("peer-draft-")) {
        const draftId = nodeId.replace("peer-", "");
        untrackInstallPeer(draftId);
        registerArtifacts(draftId, {
          boundGroupId: data.boundGroupId,
          setupKeyId: data.setupKeyId,
        });
        revokeSetupKey(data.setupKeyId);
      }

      sweepAbsorbedPlaceholders(node);

      const removedNode = reactFlow.getNodes().find((n) => n.id === nodeId);
      if (isFrameNode(removedNode)) {
        const isDraftNetwork = isDraftNetworkNode(removedNode);
        const clientId = nodeId.replace("network-", "");
        const realNetworkId = (
          removedNode?.data as { network?: { id?: string } }
        )?.network?.id;
        if (isDraftNetwork) untrackNetwork(clientId);

        const allNodes = reactFlow.getNodes();
        const containedResourceIds = allNodes
          .filter((n) => n.parentId === nodeId)
          .map((n) => n.id);
        // Recursion reuses the policy and changeset sweeps per node.
        containedResourceIds.forEach((cascadeId) =>
          removeNodeWithEdges(cascadeId),
        );

        // Non-contained resources still referencing the network lose the ref.
        setNodes((prev) =>
          prev.map((n) => {
            const ref = (
              n.data as {
                draftNetwork?: {
                  networkClientId?: string;
                  networkId?: string;
                };
              }
            )?.draftNetwork;
            const matches = isDraftNetwork
              ? ref?.networkClientId === clientId
              : !!realNetworkId && ref?.networkId === realNetworkId;
            if (!matches) return n;
            return { ...n, data: { ...n.data, draftNetwork: undefined } };
          }),
        );
      }

      if (nodeId.startsWith("resource-new-")) {
        untrackResource(nodeId.replace("resource-", ""));
      }

      // "Add Resource Group" tracked its create-group under this node id, and no
      // other remover reaches the row.
      if (nodeId.startsWith("resourcegroup-new-")) {
        const rowGroupName = getNodeGroup(node)?.name;
        if (rowGroupName) untrackNewGroup(rowGroupName);
      }

      const removedGroup = isGroupNode(node) ? getNodeGroup(node) : undefined;
      const stripsById = new Map<string, Policy>();
      if (removedGroup && node) {
        collectGroupStrip(
          reactFlow.getNodes(),
          reactFlow.getEdges(),
          node,
          stripsById,
        );
      }
      const groupPolicyUpdates = [...stripsById.values()];

      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      setSelectedDestinationGroup("");

      const policyUpdates: Policy[] = [...groupPolicyUpdates];
      if (entityId) {
        reactFlow.getNodes().forEach((n) => {
          const policy = (n.data as { policy?: Policy })?.policy;
          const rule = policy?.rules?.[0];
          if (!policy || !rule) return;
          const sourceHit = rule.sourceResource?.id === entityId;
          const destHit = rule.destinationResource?.id === entityId;
          if (!sourceHit && !destHit) return;
          policyUpdates.push({
            ...policy,
            rules: [
              {
                ...rule,
                sourceResource: sourceHit ? undefined : rule.sourceResource,
                destinationResource: destHit
                  ? undefined
                  : rule.destinationResource,
              },
              ...(policy.rules?.slice(1) ?? []),
            ],
          });
        });
      }
      deferPolicyStrips(policyUpdates);
    },
    [
      reactFlow,
      setNodes,
      setEdges,
      setSelectedDestinationGroup,
      deferPolicyStrips,
      sweepAbsorbedPlaceholders,
      untrackNetwork,
      untrackResource,
      untrackNewGroup,
      untrackInstallPeer,
      trackRemoveGroupMembers,
      registerArtifacts,
      revokeSetupKey,
    ],
  );

  // The last canvas instance of a draft-only group also drops its pending creation.
  const removeGroups = useCallback(
    (nodesToRemove: Node[]) => {
      if (nodesToRemove.length === 0) return;
      const allNodes = reactFlow.getNodes();
      const allEdges = reactFlow.getEdges();
      const removedIds = new Set(nodesToRemove.map((n) => n.id));

      nodesToRemove.forEach((n) => sweepAbsorbedPlaceholders(n));

      const updatesById = new Map<string, Policy>();
      nodesToRemove.forEach((n) => {
        if (isGroupNode(n)) {
          collectGroupStrip(allNodes, allEdges, n, updatesById);
        }
      });

      setNodes((prev) => prev.filter((n) => !removedIds.has(n.id)));
      setEdges((prev) =>
        prev.filter(
          (e) => !removedIds.has(e.source) && !removedIds.has(e.target),
        ),
      );
      setSelectedDestinationGroup("");

      const removedDraftNames = new Set<string>();
      nodesToRemove.forEach((n) => {
        const g = getNodeGroup(n);
        if (isGroupNode(n) && g && isNewGroup(g)) removedDraftNames.add(g.name);
      });
      removedDraftNames.forEach((name) => {
        const survivor = allNodes.some(
          (n) =>
            !removedIds.has(n.id) &&
            isGroupNode(n) &&
            isNewGroup(getNodeGroup(n)) &&
            getNodeGroup(n)?.name === name,
        );
        if (!survivor) untrackNewGroup(name);
      });

      deferPolicyStrips([...updatesById.values()]);
    },
    [
      reactFlow,
      setNodes,
      setEdges,
      setSelectedDestinationGroup,
      sweepAbsorbedPlaceholders,
      untrackNewGroup,
      deferPolicyStrips,
    ],
  );

  const removeGroup = useCallback(
    (node: Node) => removeGroups([node]),
    [removeGroups],
  );

  // Measured against the canvas UNIONED with live: a blank draft draws no policies.
  // The canvas copy WINS (pending edits); a delete-marked policy's DELETE deploys first.
  const policySnapshots = useCallback(() => {
    const canvasNodes = reactFlow.getNodes();
    const drawn = new Set(
      canvasNodes.flatMap((n) => {
        const id = (n.data?.policy as Policy | undefined)?.id;
        return id ? [id] : [];
      }),
    );
    const offCanvas = (policies ?? []).flatMap((p) => {
      if (!p.id || drawn.has(p.id)) return [];
      const pending = changes.find(
        (c) => isPendingPolicyWrite(c) && c.policyId === p.id,
      );
      if (pending?.type === "delete-policy") return [];
      return [{ data: { policy: pendingPolicyView(pending) ?? p } }];
    });
    return [...canvasNodes, ...offCanvas];
  }, [reactFlow, policies, changes]);

  // One pass for the whole batch: group by group rebuilds each policy from a stale canvas.
  const deleteGroups = useCallback(
    (nodes: Node[]) => {
      const groups: Group[] = [];
      const draftGroupNodes: Node[] = [];
      nodes.forEach((node) => {
        const group = getNodeGroup(node);
        if (!group) return;
        if (isNewGroup(group)) {
          draftGroupNodes.push(node);
          return;
        }
        if (!groups.some((g) => g.id === group.id)) groups.push(group);
      });
      removeGroups(draftGroupNodes);
      if (groups.length === 0) return;

      // A group DELETE is rejected while a policy references it, so empty sides go too.
      const { updates: policyUpdates } = groupDeletionPolicyUpdates(
        policySnapshots(),
        groups,
      );
      // Tagged with what the deletion took, so discarding the delete-group change
      // puts the group back into these policies instead of stranding the strip.
      policyUpdates.forEach(({ policy, basePolicy, groupIds }) =>
        trackUpdatePolicy({
          policyId: policy.id!,
          policy,
          groupDeletion: { groupIds, basePolicy },
        }),
      );

      groups.forEach((group) =>
        trackDeleteGroup({ groupId: group.id, name: group.name }),
      );

      const deletedIds = new Set(groups.map((g) => g.id));
      const instanceNodes = reactFlow.getNodes().filter((n) => {
        const groupId = isGroupNode(n) ? getNodeGroup(n)?.id : undefined;
        return !!groupId && deletedIds.has(groupId);
      });
      instanceNodes.forEach((n) => sweepAbsorbedPlaceholders(n));
      const instanceIds = new Set(instanceNodes.map((n) => n.id));
      setNodes((prev) =>
        prev
          .filter((n) => !instanceIds.has(n.id))
          .map((n) => {
            const policy = n.data?.policy as Policy | undefined;
            const updated = policy?.id
              ? policyUpdates.get(policy.id)?.policy
              : undefined;
            return updated ? { ...n, data: { ...n.data, policy: updated } } : n;
          }),
      );
      setEdges((prev) =>
        prev.filter(
          (e) => !instanceIds.has(e.source) && !instanceIds.has(e.target),
        ),
      );
      setSelectedDestinationGroup("");
    },
    [
      reactFlow,
      policySnapshots,
      trackDeleteGroup,
      trackUpdatePolicy,
      removeGroups,
      sweepAbsorbedPlaceholders,
      setNodes,
      setEdges,
      setSelectedDestinationGroup,
    ],
  );

  // "All" can never be deleted and is skipped; new groups are just removed.
  const confirmAndDeleteGroups = useCallback(
    async (groupNodes: Node[]) => {
      const deletable = groupNodes.filter(
        (n) => getNodeGroup(n) && !isAllGroup(getNodeGroup(n)),
      );
      if (deletable.length === 0) return false;

      const names = deletable
        .map((n) => `“${getNodeGroup(n)?.name}”`)
        .join(", ");

      // Only EXISTING groups deploy as a delete-group and can strip a policy bare;
      // a draft-only group is just removed and its policy edits stay canvas-local.
      const existing: Group[] = [];
      deletable.forEach((n) => {
        const group = getNodeGroup(n);
        if (!group || isNewGroup(group)) return;
        if (!existing.some((g) => g.id === group.id)) existing.push(group);
      });
      // Deleting the last group a policy authorizes deletes the POLICY too — a
      // bigger blast radius than asked for, so it goes in the ask.
      const { emptied } = groupDeletionPolicyUpdates(
        policySnapshots(),
        existing,
      );
      const nameList = (list: Policy[]) =>
        list.map((p) => `“${p.name ?? "Policy"}”`).join(", ");
      // A draft policy is not deleted — it has nothing to delete yet. It stays in
      // the changeset carrying a blocking issue until the user completes it.
      const emptiedLive = emptied.filter((p) => !p.id?.startsWith("new-"));
      const emptiedDraft = emptied.filter((p) => p.id?.startsWith("new-"));

      // Draft resources and routers naming the group are NOT stripped — only the user
      // can decide which side to give up, so the choice surfaces before confirming.
      const doomed = new Map(
        existing.flatMap((g) => (g.id ? [[g.id, g.name] as const] : [])),
      );
      const blockedBy = changes.filter(
        (c) => deletedGroupRefs(c, doomed).length > 0,
      );
      const blockerNames = blockedBy.map((c) =>
        c.type === "create-resource" || c.type === "update-resource"
          ? `resource “${c.name}”`
          : `a routing peer in “${
              c.type === "create-router" || c.type === "update-router"
                ? c.networkName
                : ""
            }”`,
      );

      const choice = await confirm({
        title: `Delete ${
          deletable.length === 1 ? "group" : `${deletable.length} groups`
        } ${names}?`,
        description: `${
          deletable.length === 1 ? "It" : "They"
        } will be marked for deletion and deleted when you review and deploy.${
          emptiedLive.length > 0
            ? ` This also deletes ${
                emptiedLive.length === 1
                  ? "the policy"
                  : `${emptiedLive.length} policies`
              } ${nameList(emptiedLive)}, which would be left authorizing nothing.`
            : ""
        }${
          emptiedDraft.length > 0
            ? ` ${
                emptiedDraft.length === 1
                  ? "The new policy"
                  : `${emptiedDraft.length} new policies`
              } ${nameList(
                emptiedDraft,
              )} would be left without a source or destination, and won't deploy until you complete ${
                emptiedDraft.length === 1 ? "it" : "them"
              }.`
            : ""
        }${
          blockerNames.length > 0
            ? ` ${
                blockerNames.length === 1 ? "Your change to" : "Your changes to"
              } ${blockerNames.join(", ")} still ${
                blockerNames.length === 1 ? "references" : "reference"
              } ${
                deletable.length === 1 ? "it" : "them"
              }, and the deletion can't deploy until you take the group off ${
                blockerNames.length === 1 ? "it" : "them"
              }.`
            : ""
        }`,
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
        dismissOnOutsideClick: true,
      });
      if (!choice) return false;

      deleteGroups(deletable);
      return true;
    },
    [confirm, deleteGroups, policySnapshots, changes],
  );

  return {
    addNewGroup,
    renameGroup,
    removeGroupMember,
    removeGroup,
    removeGroups,
    confirmAndDeleteGroups,
    removeNodeWithEdges,
  };
}
