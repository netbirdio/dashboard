import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { isEmptiedPolicy } from "@/modules/control-center/utils/change-cascade";

// Policy node snapshots hold COPIES of group objects, so renames must be
// patched into them too.
export const patchGroupInPolicies = <
  T extends { data?: Record<string, unknown> },
>(
  items: T[],
  matches: (g: Group) => boolean,
  patch: (g: Group) => Group,
): T[] => {
  let anyChanged = false;

  const next = items.map((item) => {
    const policy = item.data?.policy as Policy | undefined;
    if (!policy?.rules) return item;

    let policyChanged = false;
    const mapSide = (side: Group[] | string[] | undefined | null) => {
      if (!Array.isArray(side)) return side;
      let sideChanged = false;
      const mapped = (side as (Group | string)[]).map((g) => {
        if (typeof g === "string" || !matches(g)) return g;
        sideChanged = true;
        return patch(g);
      });
      if (!sideChanged) return side;
      policyChanged = true;
      return mapped as Group[];
    };

    const rules = policy.rules.map((rule) => {
      const sources = mapSide(rule.sources as Group[] | string[]);
      const destinations = mapSide(rule.destinations as Group[] | string[]);
      if (sources === rule.sources && destinations === rule.destinations) {
        return rule;
      }
      return {
        ...rule,
        sources: sources as typeof rule.sources,
        destinations: destinations as typeof rule.destinations,
      };
    });

    if (!policyChanged) return item;
    anyChanged = true;
    return {
      ...item,
      data: { ...item.data, policy: { ...policy, rules } },
    };
  });

  return anyChanged ? next : items;
};

// Existing groups match by id; draft groups (no id yet) match by name.
export const sameGroupMatcher = (group: Group) => (g: Group) =>
  group.id ? g.id === group.id : !g.id && g.name === group.name;

// A group must leave every referencing policy before its DELETE is sent.
export const removeGroupFromPolicy = (policy: Policy, group: Group): Policy => {
  const matches = sameGroupMatcher(group);
  let changed = false;
  const removeFromSide = (side: Group[] | string[] | undefined | null) => {
    if (!Array.isArray(side)) return side;
    const next = (side as (Group | string)[]).filter((item) => {
      if (typeof item === "string") {
        return group.id ? item !== group.id : item !== group.name;
      }
      return !matches(item);
    });
    if (next.length === side.length) return side;
    changed = true;
    return next as typeof side;
  };

  const rules = policy.rules?.map((rule) => {
    const sources = removeFromSide(rule.sources as Group[] | string[]);
    const destinations = removeFromSide(
      rule.destinations as Group[] | string[],
    );
    if (sources === rule.sources && destinations === rule.destinations) {
      return rule;
    }
    return {
      ...rule,
      sources: sources as typeof rule.sources,
      destinations: destinations as typeof rule.destinations,
    };
  });

  return changed ? { ...policy, rules } : policy;
};

// Computed once so the confirm dialog and the changeset agree on the blast radius.
// `emptied` deploy as DELETIONS, so the user must be told before confirming; each
// entry carries the pre-strip policy so discarding ONE deletion can rebuild the write.
export type GroupDeletionPolicyUpdate = {
  policy: Policy;
  basePolicy: Policy;
  groupIds: string[];
};

export const groupDeletionPolicyUpdates = (
  policyNodes: { data?: Record<string, unknown> }[],
  groups: Group[],
): {
  updates: Map<string, GroupDeletionPolicyUpdate>;
  emptied: Policy[];
} => {
  const updates = new Map<string, GroupDeletionPolicyUpdate>();
  const emptied: Policy[] = [];

  policyNodes.forEach((node) => {
    const policy = node.data?.policy as Policy | undefined;
    // A self-referencing policy draws twice, so the first node wins.
    if (!policy?.id || updates.has(policy.id)) return;
    const groupIds: string[] = [];
    const updated = groups.reduce((acc, group) => {
      const next = removeGroupFromPolicy(acc, group);
      // Identity change means this group was really in the policy.
      if (next !== acc && group.id) groupIds.push(group.id);
      return next;
    }, policy);
    if (updated === policy) return;
    updates.set(policy.id, { policy: updated, basePolicy: policy, groupIds });
    if (isEmptiedPolicy(updated)) emptied.push(updated);
  });

  return { updates, emptied };
};
