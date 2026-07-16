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
  let name = "New Group";
  let i = 1;
  while (taken.has(name)) name = `New Group (${i++})`;
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
    untrackNewGroup,
    trackDeletePolicy,
    untrackNetwork,
    untrackResource,
    untrackRouter,
  } = useDraftChangeset();

  // Drops a fresh draft group ("New Group", "New Group (1)", …) and records
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

  // Draft policies reference new groups by name; once the group is gone they
  // can never be created, so drop them (change + canvas node + edges).
  const dropPoliciesReferencing = useCallback(
    (groupName: string) => {
      const orphaned = changes.filter((c) => {
        if (c.type !== "create-policy") return false;
        const rule = c.policy.rules?.[0];
        const has = (groups?: Group[] | string[] | null) =>
          ((groups as Group[]) ?? []).some(
            (g) => typeof g !== "string" && !g.id && g.name === groupName,
          );
        return has(rule?.sources) || has(rule?.destinations);
      });
      orphaned.forEach((c) => {
        if (c.type !== "create-policy") return;
        trackDeletePolicy({ policyId: c.clientId, name: c.name });
        const policyNodeId = `policy-${c.clientId}`;
        setNodes((prev) => prev.filter((n) => n.id !== policyNodeId));
        setEdges((prev) =>
          prev.filter(
            (e) => e.source !== policyNodeId && e.target !== policyNodeId,
          ),
        );
      });
    },
    [changes, trackDeletePolicy, setNodes, setEdges],
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

      // Draft networks cascade: create-network + dependent resource/router
      // changes dropped; canvas resources lose their parent (incomplete
      // again, "Set up" affordance returns).
      if (nodeId.startsWith("network-new-")) {
        const clientId = nodeId.replace("network-", "");
        untrackNetwork(clientId);
        setNodes((prev) =>
          prev.map((n) => {
            const ref = (n.data as { draftNetwork?: { networkClientId?: string } })
              ?.draftNetwork;
            if (ref?.networkClientId !== clientId) return n;
            return { ...n, data: { ...n.data, draftNetwork: undefined } };
          }),
        );
      }

      // Draft resources: pending create + group memberships dropped.
      if (nodeId.startsWith("resource-new-")) {
        untrackResource(nodeId.replace("resource-", ""));
      }

      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      setSelectedDestinationGroup("");

      if (!entityId) return;
      const policyUpdates: Policy[] = [];
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
      if (policyUpdates.length > 0) {
        // Next tick — the node removal must be committed to the canvas
        // before drawPolicyOnCanvas rebuilds the policies' edges.
        setTimeout(() => policyUpdates.forEach((p) => updateDraftPolicy(p)), 0);
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

  // Remove: takes the node off the canvas without deleting anything. If it was
  // the last canvas instance of a draft-only group, its pending creation (and
  // any draft policies pointing at it) are dropped too.
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
          dropPoliciesReferencing(group.name);
        }
      }
    },
    [
      reactFlow,
      changes,
      removeNodeWithEdges,
      untrackNewGroup,
      dropPoliciesReferencing,
    ],
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
        description:
          "The deletion is added to your draft and applied to your network when you deploy.",
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
    removeGroup,
    deleteGroup,
    confirmAndDeleteGroups,
    removeNodeWithEdges,
  };
}
