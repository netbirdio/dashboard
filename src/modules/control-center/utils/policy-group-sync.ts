import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";

// Canvas policy nodes and their edges carry a `data.policy` snapshot whose
// rule sides hold COPIES of group objects. Group mutations (rename, member
// counts) patch the group NODES — these copies must follow, otherwise the
// policy edit modal (seeded from the policy node) and the PeerGroupSelector
// show the stale name/counts until an Auto Arrange or draft rebuild.
//
// Identity-stable: returns the input array when nothing matched, and keeps
// untouched items/rules/sides identical (the canvas re-render rules depend
// on it).
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

// Matcher for "the same group" following the canvas convention: existing
// groups match by id; draft groups (no id yet) match by name against other
// id-less references.
export const sameGroupMatcher = (group: Group) => (g: Group) =>
  group.id ? g.id === group.id : !g.id && g.name === group.name;
