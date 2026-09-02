import useFetchApi from "@utils/api";
import { Node } from "@xyflow/react";
import { useCallback } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group, GroupIssued } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import useGroupsUsage from "@/modules/groups/useGroupsUsage";

// Inlined rather than imported from useDraftGroupActions: that module reaches the
// canvas contexts, which this predicate has no need of.
const nodeGroup = (node?: Node): Group | undefined =>
  node?.data?.group as Group | undefined;

const policyReferencesGroup = (
  policy: Policy | undefined,
  groupId: string,
): boolean =>
  !!policy?.rules?.some((rule) =>
    [
      ...((rule.sources as (Group | string)[] | null) ?? []),
      ...((rule.destinations as (Group | string)[] | null) ?? []),
    ].some((g) => (typeof g === "string" ? g : g?.id) === groupId),
  );

// Same rule as the Groups page: IdP-issued groups and groups still in use can't be
// deleted. Shared by every entry point — a selection-size-dependent guard is not a guard.
export function useCanDeleteGroup() {
  const { permission } = usePermissions();
  const { data: groupsUsage } = useGroupsUsage();
  const { changes } = useDraftChangeset();
  const { data: policies } = useFetchApi<Policy[]>("/policies");

  const canDeleteGroup = useCallback(
    (group?: Group) => {
      if (!group?.id) return false;
      if (group.issued === GroupIssued.INTEGRATION) return false;
      if (!permission.groups.delete) return false;
      const usage = groupsUsage?.find((g) => g.id === group.id);
      if (!usage) return false;
      const groupId = group.id;
      // Live counts alone would forbid deleting a group whose last references the
      // draft already removes before the delete-group deploys.
      const draftReleasedPolicies = changes.filter((c) => {
        if (c.type === "delete-policy") {
          return policyReferencesGroup(
            policies?.find((p) => p.id === c.policyId),
            groupId,
          );
        }
        if (c.type === "update-policy") {
          return (
            policyReferencesGroup(
              policies?.find((p) => p.id === c.policyId),
              groupId,
            ) && !policyReferencesGroup(c.policy, groupId)
          );
        }
        return false;
      }).length;
      const draftRemovedPeers = changes.reduce(
        (sum, c) =>
          c.type === "update-group" && c.groupId === groupId
            ? sum + (c.removedPeerIds?.length ?? 0)
            : sum,
        0,
      );
      // An absorbed placeholder's setup key lists this group as an auto_group;
      // deleting the group sweeps those keys, so they don't count as live usage.
      const draftAddedPlaceholders = new Set(
        changes.flatMap((c) =>
          c.type === "update-group" && c.groupId === groupId
            ? c.peerIds.filter((id) => id.startsWith("draft-"))
            : [],
        ),
      );
      const draftSetupKeys = changes.filter(
        (c) =>
          c.type === "install-peer" &&
          !!c.setupKeyId &&
          !c.installedPeerId &&
          draftAddedPlaceholders.has(c.clientId),
      ).length;
      const inUse =
        Math.max(0, (usage.peers_count ?? 0) - draftRemovedPeers) > 0 ||
        Math.max(0, (usage.policies_count ?? 0) - draftReleasedPolicies) > 0 ||
        (usage.nameservers_count ?? 0) > 0 ||
        (usage.zones_count ?? 0) > 0 ||
        (usage.routes_count ?? 0) > 0 ||
        Math.max(0, (usage.setup_keys_count ?? 0) - draftSetupKeys) > 0 ||
        (usage.users_count ?? 0) > 0 ||
        (usage.resources_count ?? 0) > 0;
      return !inUse;
    },
    [groupsUsage, permission.groups.delete, changes, policies],
  );

  // A draft-only group is Removed, not deleted, so it needs no permission: nothing
  // about it has reached the account yet.
  const deletableGroupNodes = useCallback(
    (groupNodes: Node[]) =>
      groupNodes.filter((n) => {
        const group = nodeGroup(n);
        if (!group) return false;
        return !group.id || canDeleteGroup(group);
      }),
    [canDeleteGroup],
  );

  return { canDeleteGroup, deletableGroupNodes };
}
