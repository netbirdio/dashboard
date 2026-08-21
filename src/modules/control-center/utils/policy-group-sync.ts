import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";

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
