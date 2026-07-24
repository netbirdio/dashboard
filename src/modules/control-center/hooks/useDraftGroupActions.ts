import { useCallback } from "react";
import { Node, XYPosition, useReactFlow } from "@xyflow/react";
import { Group, GroupIssued } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { useDialog } from "@/contexts/DialogProvider";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { getNetworkRef } from "@/modules/control-center/hooks/useDraftNetworkActions";
import {
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

// A draft-only group: exists on the canvas but has no API id yet.
export const isNewGroup = (group?: Group) => !!group && !group.id;

export const isAllGroup = (group?: Group) => group?.name === "All";

// JWT / IdP-issued groups can't be renamed via the API; "All" never can.
export const canRenameGroup = (group?: Group) =>
  !!group &&
  !isAllGroup(group) &&
  (isNewGroup(group) || !group.issued || group.issued === GroupIssued.API);

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getNextNewGroupName = (taken: Set<string>) => {
  let name = "Group";
  let i = 2;
  while (taken.has(name)) name = `Group (${i++})`;
  return name;
};

// All draft actions on groups: drop a new group, rename, remove from canvas,
// mark for deletion. Everything only touches the canvas + changeset — the API
// is called on deploy.
export function useDraftGroupActions() {
  const reactFlow = useReactFlow();
  const { setNodes, setEdges, setSelectedDestinationGroup } = useCanvasState();
  const { groups } = useControlCenterData();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const { confirm } = useDialog();
  const {
    changes,
    trackCreateGroup,
    trackRenameGroup,
    trackDeleteGroup,
    trackRemoveGroupMembers,
    removeGroupFromDraftResource,
    untrackNewGroup,
    untrackNetwork,
    untrackResource,
    untrackRouter,
  } = useDraftChangeset();

  // Drops a fresh draft group ("Group", "Group (1)", …) and records
  // the create change. The group panel opens on click, not on drop.
  const addNewGroup = useCallback(
    (position: XYPosition) => {
      const taken = new Set<string>();
      groups?.forEach((g) => taken.add(g.name));
      reactFlow
        .getNodes()
        .forEach((n) => getNodeGroup(n)?.name && taken.add(getNodeGroup(n)!.name));
      changes.forEach((c) => c.type === "create-group" && taken.add(c.name));

      const name = getNextNewGroupName(taken);
      const nodeId = `group-new-${uid()}`;
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

  // Renames a group everywhere on the canvas (source node + destination
  // copies share the same group) and records the change.
  const renameGroup = useCallback(
    (node: Node, newName: string) => {
      const group = getNodeGroup(node);
      if (!group || group.name === newName) return;
      const from = group.name;

      setNodes((prev) =>
        prev.map((n) => {
          const g = getNodeGroup(n);
          if (!g || g.name !== from) return n;
          if (group.id ? g.id !== group.id : !!g.id) return n;
          return { ...n, data: { ...n.data, group: { ...g, name: newName } } };
        }),
      );

      trackRenameGroup({ groupId: group.id, from, to: newName });
    },
    [setNodes, trackRenameGroup],
  );

  // Removes a single member (peer or resource) from a group: updates every
  // canvas instance of the group (counts + addedMembers/removedMembers) and
  // records the changeset entry. Draft-added members simply revert their
  // addition; existing members are removed on deploy.
  const removeGroupMember = useCallback(
    (
      group: Group,
      member: { peerId?: string; resourceId?: string },
    ) => {
      const itemId = member.peerId ?? member.resourceId;
      if (!itemId) return;

      setNodes((prev) =>
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
          // Draft-added members revert; existing ones are marked removed.
          if (addedMembers.has(itemId)) addedMembers.delete(itemId);
          else removedMembers.add(itemId);
          const updated = { ...g };
          if (member.peerId) {
            updated.peers_count = Math.max(0, (updated.peers_count || 0) - 1);
          }
          if (member.resourceId) {
            updated.resources_count = Math.max(
              0,
              (updated.resources_count || 0) - 1,
            );
          }
          return {
            ...n,
            data: { ...n.data, group: updated, addedMembers, removedMembers },
          };
        }),
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
    [setNodes, trackRemoveGroupMembers, removeGroupFromDraftResource],
  );

  const removeNodeWithEdges = useCallback(
    (nodeId: string) => {
      // Removing a peer (real or placeholder) or resource also removes it
      // from any policy that referenced it as its single source/destination
      // — the cleared side mirrors the removed connection.
      const node = reactFlow.getNodes().find((n) => n.id === nodeId);
      const data = node?.data as
        | {
            peer?: { id?: string };
            resource?: { id?: string };
            placeholderKind?: string;
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

      // Removing a network frame (draft or existing) cascades: its contained
      // resources are removed with it, and so are routing peers whose ONLY
      // connection was routing this network (the Add Routing Peer placeholders
      // — peers/groups with other relationships stay). Draft networks also
      // drop their create-network + dependent changes (untrackNetwork).
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

        // Recursive removal reuses the policy/changeset sweeps per node.
        [...containedResourceIds, ...soleRouterPeerIds].forEach((cascadeId) =>
          removeNodeWithEdges(cascadeId),
        );

        // Any non-contained resource still referencing the network loses it —
        // matched by client id (draft) or real id (existing).
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

      // Draft resources: pending create + group memberships dropped.
      if (nodeId.startsWith("resource-new-")) {
        untrackResource(nodeId.replace("resource-", ""));
      }

      // Removing a GROUP node also removes the group from the policies it was
      // connected to — mirroring the peer/resource sweep below, but for the
      // sources/destinations group lists. The removed node's edges say which
      // side(s) of which policies it served (a self-ref policy draws the group
      // twice: source node + dest copy — only the removed side is cleared).
      // Snapshot before the node and its edges disappear.
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
          const isSourceSide = e.source === nodeId; // group → policy
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
        // Next tick — the node removal must be committed to the canvas
        // before drawPolicyOnCanvas rebuilds the policies' edges. A policy
        // removed in the same cascade (e.g. Remove-policy also removing its
        // endpoints) is skipped — updating it would redraw it.
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
    ],
  );

  // Remove: takes the node off the canvas without deleting anything.
  // removeNodeWithEdges clears the group out of the policies this node was
  // connected to. If it was the last canvas instance of a draft-only group,
  // its pending creation is dropped too.
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

  // Delete: records a delete-group change (DELETE on deploy) and removes every
  // canvas instance of the group.
  const deleteGroup = useCallback(
    (node: Node) => {
      const group = getNodeGroup(node);
      if (!group) return;

      if (isNewGroup(group)) {
        removeGroup(node);
        return;
      }

      trackDeleteGroup({ groupId: group.id, name: group.name });
      const instanceIds = new Set(
        reactFlow
          .getNodes()
          .filter((n) => isGroupNode(n) && getNodeGroup(n)?.id === group.id)
          .map((n) => n.id),
      );
      setNodes((prev) => prev.filter((n) => !instanceIds.has(n.id)));
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
      removeGroup,
      setNodes,
      setEdges,
      setSelectedDestinationGroup,
    ],
  );

  // Confirms once, then marks every deletable selected group for deletion.
  // "All" can never be deleted and is skipped; new groups just get removed.
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
      });
      if (!choice) return false;

      deletable.forEach((n) => deleteGroup(n));
      return true;
    },
    [confirm, deleteGroup],
  );

  return {
    addNewGroup,
    renameGroup,
    removeGroupMember,
    removeGroup,
    deleteGroup,
    confirmAndDeleteGroups,
    removeNodeWithEdges,
  };
}
