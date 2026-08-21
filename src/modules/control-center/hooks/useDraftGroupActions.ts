import { useCallback } from "react";
import { Node, XYPosition, useReactFlow } from "@xyflow/react";
import { Group, GroupIssued } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { useDialog } from "@/contexts/DialogProvider";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { usePlaceholderArtifacts } from "@/modules/control-center/hooks/usePlaceholderArtifacts";
import { getNetworkRef } from "@/modules/control-center/hooks/useDraftNetworkActions";
import {
  patchGroupInPolicies,
  removeGroupFromPolicy,
  sameGroupMatcher,
} from "@/modules/control-center/utils/policy-group-sync";
import {
  draftUid,
  getTopZIndex,
  isDraftNetworkNode,
  isFrameNode,
} from "@/modules/control-center/utils/helpers";
import { NodeType } from "@/modules/control-center/utils/nodes";

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

// Every action here touches only the canvas and the changeset; the API runs on deploy.
export function useDraftGroupActions() {
  const reactFlow = useReactFlow();
  const { setNodes, setEdges, setSelectedDestinationGroup } = useCanvasState();
  const { groups } = useControlCenterData();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const { confirm } = useDialog();
  const deleteArtifacts = usePlaceholderArtifacts();
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
    untrackRouter,
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

      setNodes((prev) =>
        patchGroupInPolicies(
          prev.map((n) => {
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

      // An uninstalled placeholder takes its install-peer entry, setup key and group along.
      if (data?.placeholderKind && nodeId.startsWith("peer-draft-")) {
        untrackInstallPeer(nodeId.replace("peer-", ""));
        deleteArtifacts({
          boundGroupId: data.boundGroupId,
          setupKeyId: data.setupKeyId,
        });
      }

      // A removed group node takes its absorbed placeholders and their artifacts along.
      data?.draftPeers?.forEach((p) => {
        if (!p?.id?.startsWith("draft-")) return;
        untrackInstallPeer(p.id);
        if (p.boundGroupId || p.setupKeyId) {
          deleteArtifacts({
            boundGroupId: p.boundGroupId,
            setupKeyId: p.setupKeyId,
          });
        }
      });

      // Router changes whose routing edge passes through this node go too.
      reactFlow
        .getEdges()
        .filter(
          (e) =>
            (e.data as { router?: boolean })?.router &&
            (e.source === nodeId || e.target === nodeId),
        )
        .forEach((e) => {
          const networkRef = getNetworkRef(
            reactFlow.getNodes().find((n) => n.id === e.target),
          );
          if (!networkRef) return;
          const source = reactFlow.getNodes().find((n) => n.id === e.source);
          const group = (source?.data as { group?: Group })?.group;
          untrackRouter({
            networkRef: networkRef.networkId ?? networkRef.networkClientId!,
            ...(e.source.startsWith("peer-")
              ? { peerId: e.source.replace("peer-", "") }
              : { groupId: group?.id ?? group?.name }),
          });
        });

      // Removing a frame cascades to contained resources and sole-purpose routing peers.
      const removedNode = reactFlow.getNodes().find((n) => n.id === nodeId);
      if (isFrameNode(removedNode)) {
        const isDraftNetwork = isDraftNetworkNode(removedNode);
        const clientId = nodeId.replace("network-", "");
        const realNetworkId = (
          removedNode?.data as { network?: { id?: string } }
        )?.network?.id;
        if (isDraftNetwork) untrackNetwork(clientId);

        const allNodes = reactFlow.getNodes();
        const allEdges = reactFlow.getEdges();
        const containedResourceIds = allNodes
          .filter((n) => n.parentId === nodeId)
          .map((n) => n.id);
        const soleRouterPeerIds = allEdges
          .filter(
            (e) =>
              (e.data as { router?: boolean })?.router &&
              e.target === nodeId &&
              e.source.startsWith("peer-") &&
              allEdges.filter(
                (other) => other.source === e.source || other.target === e.source,
              ).length === 1,
          )
          .map((e) => e.source);

        // Recursion reuses the policy and changeset sweeps per node.
        [...containedResourceIds, ...soleRouterPeerIds].forEach((cascadeId) =>
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

      // A self-ref policy draws the group twice, so snapshot the edges that decide the side.
      const removedGroup = isGroupNode(node) ? getNodeGroup(node) : undefined;
      const groupPolicyUpdates: Policy[] = [];
      if (removedGroup) {
        const gKey = removedGroup.id ?? removedGroup.name;
        const matchesGroup = (g: Group | string) =>
          (typeof g === "string" ? g : g.id ?? g.name) === gKey;
        const allNodes = reactFlow.getNodes();
        const updatesById = new Map<string, Policy>();
        reactFlow.getEdges().forEach((e) => {
          if (e.source !== nodeId && e.target !== nodeId) return;
          const isSourceSide = e.source === nodeId;
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
        groupPolicyUpdates.push(...updatesById.values());
      }

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
      if (policyUpdates.length > 0) {
        // Next tick: the removal must hit the canvas before drawPolicyOnCanvas rebuilds edges.
        setTimeout(() => {
          const remaining = new Set(reactFlow.getNodes().map((n) => n.id));
          policyUpdates.forEach(
            (p) => remaining.has(`policy-${p.id}`) && updateDraftPolicy(p),
          );
        }, 0);
      }
    },
    [
      reactFlow,
      setNodes,
      setEdges,
      setSelectedDestinationGroup,
      updateDraftPolicy,
      untrackNetwork,
      untrackResource,
      untrackRouter,
      untrackInstallPeer,
      deleteArtifacts,
    ],
  );

  // The last canvas instance of a draft-only group also drops its pending creation.
  const removeGroup = useCallback(
    (node: Node) => {
      const group = getNodeGroup(node);
      removeNodeWithEdges(node.id);

      if (group && isNewGroup(group)) {
        const otherInstance = reactFlow
          .getNodes()
          .some(
            (n) =>
              n.id !== node.id &&
              isGroupNode(n) &&
              isNewGroup(getNodeGroup(n)) &&
              getNodeGroup(n)?.name === group.name,
          );
        if (!otherInstance) {
          untrackNewGroup(group.name);
        }
      }
    },
    [reactFlow, removeNodeWithEdges, untrackNewGroup],
  );

  // One pass for the whole batch: group by group rebuilds each policy from a stale canvas.
  const deleteGroups = useCallback(
    (nodes: Node[]) => {
      const groups: Group[] = [];
      nodes.forEach((node) => {
        const group = getNodeGroup(node);
        if (!group) return;
        if (isNewGroup(group)) {
          removeGroup(node);
          return;
        }
        if (!groups.some((g) => g.id === group.id)) groups.push(group);
      });
      if (groups.length === 0) return;

      // A group DELETE is rejected while a policy references it, so empty sides go too.
      const policyUpdates = new Map<string, Policy>();
      reactFlow.getNodes().forEach((candidate) => {
        const policy = candidate.data?.policy as Policy | undefined;
        if (!policy?.id) return;
        const updated = groups.reduce(
          (acc, group) => removeGroupFromPolicy(acc, group),
          policy,
        );
        if (updated !== policy) policyUpdates.set(policy.id, updated);
      });
      policyUpdates.forEach((policy) =>
        trackUpdatePolicy({ policyId: policy.id!, policy }),
      );

      groups.forEach((group) =>
        trackDeleteGroup({ groupId: group.id, name: group.name }),
      );

      const deletedIds = new Set(groups.map((g) => g.id));
      const instanceIds = new Set(
        reactFlow
          .getNodes()
          .filter((n) => {
            const groupId = isGroupNode(n) ? getNodeGroup(n)?.id : undefined;
            return !!groupId && deletedIds.has(groupId);
          })
          .map((n) => n.id),
      );
      setNodes((prev) =>
        prev
          .filter((n) => !instanceIds.has(n.id))
          .map((n) => {
            const policy = n.data?.policy as Policy | undefined;
            const updated = policy?.id
              ? policyUpdates.get(policy.id)
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
      trackDeleteGroup,
      trackUpdatePolicy,
      removeGroup,
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
      const choice = await confirm({
        title: `Delete ${
          deletable.length === 1 ? "group" : `${deletable.length} groups`
        } ${names}?`,
        description: `${
          deletable.length === 1 ? "It" : "They"
        } will be marked for deletion and deleted when you review and deploy.`,
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
        dismissOnOutsideClick: true,
      });
      if (!choice) return false;

      deleteGroups(deletable);
      return true;
    },
    [confirm, deleteGroups],
  );

  return {
    addNewGroup,
    renameGroup,
    removeGroupMember,
    removeGroup,
    confirmAndDeleteGroups,
    removeNodeWithEdges,
  };
}
