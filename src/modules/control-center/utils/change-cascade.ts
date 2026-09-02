import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
// Types only: DraftChangesetContext imports the reducers below, so a value import
// here would close the cycle.
import type {
  DeletePolicyChange,
  DraftChange,
  PolicyGroupDeletion,
  UpdateGroupChange,
  UpdatePolicyChange,
} from "@/modules/control-center/draft/DraftChangesetContext";

// Removing a changeset entry must leave the draft as if the change had never
// been made. The canvas half lives in hooks/useRemoveChange.ts.

// A fully reverted update-group must be dropped: its PUT body equals the live group.
export const isNoopGroupUpdate = (change: UpdateGroupChange) =>
  change.name === change.originalName &&
  change.peerIds.length === 0 &&
  change.resourceIds.length === 0 &&
  (change.removedPeerIds?.length ?? 0) === 0 &&
  (change.removedResourceIds?.length ?? 0) === 0;

// Either side stripped bare authorizes nothing, so the policy deploys as a deletion.
// Narrower than `isDeployablePolicy` on purpose: a policy pointing at an uninstalled
// placeholder is a pending change blocked by its install-peer issue, not a deletion.
export const isEmptiedPolicy = (policy: Policy) => {
  const rule = policy.rules?.[0];
  if (!rule) return false;
  const hasSource = (rule.sources?.length ?? 0) > 0 || !!rule.sourceResource;
  const hasDestination =
    (rule.destinations?.length ?? 0) > 0 || !!rule.destinationResource;
  return !hasSource || !hasDestination;
};

// Mutually exclusive by construction: CHANGE_DEPLOY_ORDER sends the update and
// then the delete, so recording either one must clear the other.
export const isPendingPolicyWrite = (
  change: DraftChange,
): change is UpdatePolicyChange | DeletePolicyChange =>
  change.type === "update-policy" || change.type === "delete-policy";

const groupKey = (g: Group | string) => (typeof g === "string" ? g : g.id ?? "");

/**
 * Puts the group entries `source` holds back into `target`, side by side. Rebases a
 * deletion tag onto a hand edit: only the old baseline knows what was taken out.
 */
const reinstateGroups = (
  target: Policy,
  source: Policy,
  groupIds: string[],
): Policy => {
  const add = (
    into: Group[] | string[] | null | undefined,
    from: Group[] | string[] | null | undefined,
  ) => {
    if (!Array.isArray(from)) return into;
    const kept = Array.isArray(into) ? (into as (Group | string)[]) : [];
    const present = new Set(kept.map(groupKey));
    // A hand edit that re-added the group itself must not get a second copy.
    const missing = (from as (Group | string)[]).filter(
      (g) => groupIds.includes(groupKey(g)) && !present.has(groupKey(g)),
    );
    return missing.length === 0 ? into : ([...kept, ...missing] as Group[]);
  };

  return {
    ...target,
    rules: target.rules?.map((rule, i) => {
      const from = source.rules?.[i];
      if (!from) return rule;
      return {
        ...rule,
        sources: add(rule.sources, from.sources) as typeof rule.sources,
        destinations: add(
          rule.destinations,
          from.destinations,
        ) as typeof rule.destinations,
      };
    }),
  };
};

/**
 * Deletions ACCUMULATE and the baseline stays the EARLIEST one — only it still holds
 * every group being taken out. An untagged (ordinary) edit does NOT clear the tag:
 * the strip lives on inside it, so the tag is REBASED and marked `handEdited`.
 */
export const mergeGroupDeletions = (
  superseded: PolicyGroupDeletion | undefined,
  incoming: PolicyGroupDeletion | undefined,
  // The policy being written now. Absent when the edit leaves it authorizing
  // nothing: that is a delete request, so the tag really does go.
  nextPolicy?: Policy,
  // True when the replaced write held work of the user's own rather than existing only
  // for an earlier deletion.
  supersedesUserWrite?: boolean,
): PolicyGroupDeletion | undefined => {
  if (incoming) {
    if (!superseded) {
      return supersedesUserWrite ? { ...incoming, handEdited: true } : incoming;
    }
    return {
      groupIds: Array.from(
        new Set([...superseded.groupIds, ...incoming.groupIds]),
      ),
      basePolicy: superseded.basePolicy,
      ...(superseded.handEdited ? { handEdited: true } : {}),
    };
  }
  if (!superseded || !nextPolicy) return undefined;
  return {
    groupIds: superseded.groupIds,
    basePolicy: reinstateGroups(
      nextPolicy,
      superseded.basePolicy,
      superseded.groupIds,
    ),
    handEdited: true,
  };
};

/** Canvas node id a change's entity renders as; routers have none. */
export function changeNodeId(change: DraftChange): string | undefined {
  switch (change.type) {
    case "create-group":
      // clientId is already the node id (group-new-<uuid>).
      return change.clientId;
    case "update-group":
    case "delete-group":
      return `group-${change.groupId}`;
    case "create-policy":
      return `policy-${change.clientId}`;
    case "update-policy":
    case "delete-policy":
      return `policy-${change.policyId}`;
    case "create-network":
      return `network-${change.clientId}`;
    case "update-network":
    case "delete-network":
      return `network-${change.networkId}`;
    case "create-resource":
      return `resource-${change.clientId}`;
    case "update-resource":
    case "delete-resource":
      return `resource-${change.resourceId}`;
    case "install-peer":
      return `peer-${change.clientId}`;
    default:
      return undefined;
  }
}

// A draft group has a name and no id, so it can only be matched by name.
const dropGroupFromRule = (
  groups: Group[] | string[] | null | undefined,
  name: string,
) =>
  groups
    ? (groups as Group[]).filter(
        (g) => typeof g === "string" || g.id || g.name !== name,
      )
    : groups;

/** The policy with a removed DRAFT group (id-less, matched by name) stripped out. */
export const stripDraftGroupFromPolicy = (
  policy: Policy,
  name: string,
): Policy => ({
  ...policy,
  rules: policy.rules?.map((r) => ({
    ...r,
    sources: dropGroupFromRule(r.sources, name) as typeof r.sources,
    destinations: dropGroupFromRule(
      r.destinations,
      name,
    ) as typeof r.destinations,
    // authorized_groups is keyed by group name, not id.
    ...(r.authorized_groups
      ? {
          authorized_groups: Object.fromEntries(
            Object.entries(r.authorized_groups).filter(([key]) => key !== name),
          ),
        }
      : {}),
  })),
});

/** Strip a removed DRAFT group out of every other change. */
export function dropGroupNameReferences(
  changes: DraftChange[],
  name: string,
): DraftChange[] {
  return changes.flatMap((c): DraftChange[] => {
    if (c.type === "create-resource" || c.type === "update-resource") {
      if (!c.groupIds.includes(name)) return [c];
      return [{ ...c, groupIds: c.groupIds.filter((g) => g !== name) }];
    }
    if (c.type === "create-router" || c.type === "update-router") {
      // The group was this router's only target, so it routes nothing now.
      return c.groupId === name ? [] : [c];
    }
    if (c.type === "create-policy" || c.type === "update-policy") {
      return [{ ...c, policy: stripDraftGroupFromPolicy(c.policy, name) }];
    }
    return [c];
  });
}

/** The policy with any source/destination resource ref to `refId` cleared. */
export const clearPolicyResourceRef = (policy: Policy, refId: string): Policy => ({
  ...policy,
  rules: policy.rules?.map((r) => ({
    ...r,
    sourceResource:
      r.sourceResource?.id === refId ? undefined : r.sourceResource,
    destinationResource:
      r.destinationResource?.id === refId ? undefined : r.destinationResource,
  })),
});

const clearResourceRef = (change: DraftChange, refId: string): DraftChange => {
  if (change.type !== "create-policy" && change.type !== "update-policy") {
    return change;
  }
  return { ...change, policy: clearPolicyResourceRef(change.policy, refId) };
};

// A policy needs both sides, so one left one-sided by a removal is dropped.
const isTrackablePolicyChange = (c: DraftChange): boolean => {
  if (c.type !== "create-policy" && c.type !== "update-policy") return true;
  const r = c.policy.rules?.[0];
  if (!r) return false;
  const hasSide = (side: unknown, resource: unknown) =>
    (Array.isArray(side) && side.length > 0) || !!resource;
  return (
    hasSide(r.sources, r.sourceResource) &&
    hasSide(r.destinations, r.destinationResource)
  );
};

const dropUntrackablePolicies = (changes: DraftChange[]): DraftChange[] =>
  changes.filter(isTrackablePolicyChange);

// A no-op update-group would deploy as a pointless PUT and show an empty row.
const isSpentGroupUpdate = (c: DraftChange): boolean =>
  c.type === "update-group" && isNoopGroupUpdate(c);

const dropGroupIdsFromPolicy = (policy: Policy, groupIds: string[]): Policy => {
  // Only an EXISTING group deploys as a delete-group, so groupIds holds real ids only
  // and the `""` of a draft group matches nothing.
  const drop = (side: Group[] | string[] | null | undefined) =>
    Array.isArray(side)
      ? ((side as (Group | string)[]).filter(
          (g) => !groupIds.includes(groupKey(g)),
        ) as Group[])
      : side;
  return {
    ...policy,
    rules: policy.rules?.map((r) => ({
      ...r,
      sources: drop(r.sources) as typeof r.sources,
      destinations: drop(r.destinations) as typeof r.destinations,
    })),
  };
};

/**
 * Groups a `delete-group` is pending for, id → name. Referencing resources and routers
 * deploy BEFORE the delete and are never stripped — a landed reference fails it for good.
 */
export const pendingGroupDeletions = (
  changes: DraftChange[],
): Map<string, string> =>
  new Map(
    changes.flatMap((c) =>
      c.type === "delete-group" ? ([[c.groupId, c.name]] as const) : [],
    ),
  );

/** The pending-deletion groups a resource or router change still references. */
export const deletedGroupRefs = (
  change: DraftChange,
  deleted: Map<string, string>,
): string[] => {
  if (deleted.size === 0) return [];
  if (change.type === "create-resource" || change.type === "update-resource") {
    return change.groupIds.filter((id) => deleted.has(id));
  }
  if (change.type === "create-router" || change.type === "update-router") {
    return change.groupId && deleted.has(change.groupId)
      ? [change.groupId]
      : [];
  }
  return [];
};

export const policyGroupIds = (policy: Policy): string[] => {
  const ids = new Set<string>();
  policy.rules?.forEach((rule) => {
    [rule.sources, rule.destinations].forEach((side) => {
      if (!Array.isArray(side)) return;
      (side as (Group | string)[]).forEach((g) => {
        const key = groupKey(g);
        if (key) ids.add(key);
      });
    });
  });
  return Array.from(ids);
};

/**
 * The policy write a policy still owes to group deletions in flight. Discarding a
 * pending write restores the LIVE policy — doomed groups included — so the strip is
 * re-recorded under the same change id.
 */
export function pendingGroupDeletionWrite(
  changes: DraftChange[],
  live: Policy,
  changeId: string,
): UpdatePolicyChange | DeletePolicyChange | undefined {
  if (!live.id) return undefined;
  const referenced = new Set(policyGroupIds(live));
  const groupIds = changes.flatMap((c) =>
    c.type === "delete-group" && referenced.has(c.groupId) ? [c.groupId] : [],
  );
  if (groupIds.length === 0) return undefined;

  const policy = dropGroupIdsFromPolicy(live, groupIds);
  const groupDeletion = { groupIds, basePolicy: live };
  const name = live.name ?? "Policy";
  // Same update-versus-delete decision deleteGroups makes.
  return isEmptiedPolicy(policy)
    ? { id: changeId, type: "delete-policy", policyId: live.id, name, groupDeletion }
    : {
        id: changeId,
        type: "update-policy",
        policyId: live.id,
        name,
        policy,
        origin: "edit",
        groupDeletion,
      };
}

/**
 * The policy a pending write leaves on the canvas. A deletion-driven `delete-policy` is
 * rebuilt from its baseline minus the strip — LIVE would redraw the doomed groups.
 */
export const pendingPolicyView = (
  change?: DraftChange,
): Policy | undefined => {
  if (!change || !isPendingPolicyWrite(change)) return undefined;
  if (change.type === "update-policy") return change.policy;
  const tag = change.groupDeletion;
  return tag ? dropGroupIdsFromPolicy(tag.basePolicy, tag.groupIds) : undefined;
};

/**
 * The resources a restore should build its rows from: pending child edits and
 * deletions outlive the network's restore.
 */
export function pendingResourceViews(
  resources: NetworkResource[] | undefined,
  changes: DraftChange[],
): NetworkResource[] {
  const deleted = new Set(
    changes.flatMap((c) => (c.type === "delete-resource" ? [c.resourceId] : [])),
  );
  const edits = new Map(
    changes.flatMap((c) =>
      c.type === "update-resource" ? ([[c.resourceId, c]] as const) : [],
    ),
  );
  return (resources ?? []).flatMap((r) => {
    if (deleted.has(r.id)) return [];
    const edit = edits.get(r.id);
    if (!edit) return [r];
    return [
      {
        ...r,
        name: edit.name,
        address: edit.address,
        description: edit.description,
        enabled: edit.enabled,
      },
    ];
  });
}

/**
 * Puts a restored group back into the policy writes its deletion forced, rebuilding from
 * each write's pre-strip baseline — live would also undo a hand edit made after the deletion.
 */
export function restoreDeletedGroupInPolicies(
  changes: DraftChange[],
  groupId: string,
): DraftChange[] {
  return changes.flatMap((c): DraftChange[] => {
    // Draft policies are stripped too (a create-policy deploys BEFORE the
    // delete-group) and restored in place: a create is the user's own work.
    if (c.type === "create-policy") {
      if (!c.groupDeletion?.groupIds.includes(groupId)) return [c];
      const { groupIds, basePolicy, handEdited } = c.groupDeletion;
      const remaining = groupIds.filter((id) => id !== groupId);
      const policy = dropGroupIdsFromPolicy(basePolicy, remaining);
      return [
        {
          ...c,
          name: policy.name ?? c.name,
          policy,
          groupDeletion:
            remaining.length > 0
              ? {
                  groupIds: remaining,
                  basePolicy,
                  ...(handEdited && { handEdited }),
                }
              : undefined,
        },
      ];
    }
    if (!isPendingPolicyWrite(c) || !c.groupDeletion) return [c];
    const { groupIds, basePolicy, handEdited } = c.groupDeletion;
    if (!groupIds.includes(groupId)) return [c];
    const remaining = groupIds.filter((id) => id !== groupId);
    // The write existed only for the deletion being discarded; a hand-edited one
    // survives, since its baseline carries that edit.
    if (remaining.length === 0 && !handEdited) return [];
    const policy = dropGroupIdsFromPolicy(basePolicy, remaining);
    // An inert tag is no tag: with nothing left stripped there is nothing to restore.
    const groupDeletion =
      remaining.length > 0
        ? { groupIds: remaining, basePolicy, ...(handEdited && { handEdited }) }
        : undefined;
    const name = policy.name ?? c.name;
    // Putting a group back can take the policy off the emptied path, so the
    // update-versus-delete decision is made again rather than carried over.
    return [
      isEmptiedPolicy(policy)
        ? {
            id: c.id,
            type: "delete-policy",
            policyId: c.policyId,
            name,
            groupDeletion,
          }
        : {
            id: c.id,
            type: "update-policy",
            policyId: c.policyId,
            name,
            policy,
            origin: "edit",
            groupDeletion,
          },
    ];
  });
}

/**
 * Detaches a removed draft network's resources to "No Network" and drops its
 * routers, which are meaningless without it.
 */
export function detachChangesFromDraftNetwork(
  changes: DraftChange[],
  clientId: string,
): DraftChange[] {
  return changes.flatMap((c): DraftChange[] => {
    if (c.type === "create-resource" && c.networkClientId === clientId) {
      return [
        {
          ...c,
          networkId: undefined,
          networkClientId: undefined,
          networkName: "",
        },
      ];
    }
    if (
      (c.type === "create-router" || c.type === "update-router") &&
      "networkClientId" in c &&
      c.networkClientId === clientId
    ) {
      return [];
    }
    return [c];
  });
}

/** The changeset after removing `change`, with cascade. */
export function reduceRemoveChange(
  changes: DraftChange[],
  change: DraftChange,
): DraftChange[] {
  const withoutTarget = changes.filter((c) => c.id !== change.id);

  switch (change.type) {
    case "create-group":
      // The group is referenced by NAME everywhere it's used.
      return dropUntrackablePolicies(
        dropGroupNameReferences(withoutTarget, change.name),
      );

    case "delete-group":
      return restoreDeletedGroupInPolicies(withoutTarget, change.groupId);

    case "create-network":
      return detachChangesFromDraftNetwork(withoutTarget, change.clientId);

    case "create-resource": {
      const clientId = change.clientId;
      return dropUntrackablePolicies(
        withoutTarget
          .map((c): DraftChange => {
            if (
              (c.type === "create-group" || c.type === "update-group") &&
              c.resourceIds.includes(clientId)
            ) {
              return {
                ...c,
                resourceIds: c.resourceIds.filter((r) => r !== clientId),
              };
            }
            return clearResourceRef(c, clientId);
          })
          .filter((c) => !isSpentGroupUpdate(c)),
      );
    }

    case "install-peer": {
      const clientId = change.clientId;
      return dropUntrackablePolicies(
        withoutTarget
          .flatMap((c): DraftChange[] => {
            if (
              (c.type === "create-router" || c.type === "update-router") &&
              c.peerId === clientId
            ) {
              return [];
            }
            return [c];
          })
          .map((c): DraftChange => {
            if (
              (c.type === "create-group" || c.type === "update-group") &&
              c.peerIds.includes(clientId)
            ) {
              return {
                ...c,
                peerIds: c.peerIds.filter((p) => p !== clientId),
              };
            }
            return clearResourceRef(c, clientId);
          })
          .filter((c) => !isSpentGroupUpdate(c)),
      );
    }

    default:
      return withoutTarget;
  }
}

export type CascadePreview = {
  summary: string;
  effects: string[];
};

type PreviewNode = {
  id: string;
  type?: string;
  parentId?: string;
  data?: any;
};
type PreviewEdge = { source: string; target: string; data?: any };

const plural = (n: number, one: string, many = one + "s") =>
  `${n} ${n === 1 ? one : many}`;

/** Human-readable side effects of removing `change`, for the confirm dialog. */
export function previewRemoveChange(
  change: DraftChange,
  changes: DraftChange[],
  nodes: PreviewNode[],
  edges: PreviewEdge[],
): CascadePreview {
  const effects: string[] = [];

  const policiesTouchingNode = (nodeId: string) => {
    const ids = new Set<string>();
    for (const e of edges) {
      if (e.source === nodeId && e.target.startsWith("policy-")) {
        ids.add(e.target);
      }
      if (e.target === nodeId && e.source.startsWith("policy-")) {
        ids.add(e.source);
      }
    }
    return ids;
  };

  switch (change.type) {
    case "create-group": {
      const nodeIds = nodes
        .filter(
          (n) =>
            n.id === change.clientId ||
            (n.data?.group &&
              n.data.group.name === change.name &&
              !n.data.group.id),
        )
        .map((n) => n.id);
      const policyCount = new Set(
        nodeIds.flatMap((id) => [...policiesTouchingNode(id)]),
      ).size;
      const resourceCount = changes.filter(
        (c) =>
          (c.type === "create-resource" || c.type === "update-resource") &&
          c.groupIds.includes(change.name),
      ).length;
      const routerCount = changes.filter(
        (c) =>
          (c.type === "create-router" || c.type === "update-router") &&
          c.groupId === change.name,
      ).length;
      if (policyCount)
        effects.push(`Removes it from ${plural(policyCount, "policy", "policies")}`);
      if (resourceCount)
        effects.push(`Removes it from ${plural(resourceCount, "resource")}`);
      if (routerCount)
        effects.push(`Drops ${plural(routerCount, "routing-peer change")}`);
      return {
        summary: `Remove the new group “${change.name}”?`,
        effects,
      };
    }

    case "create-network": {
      const frameId = `network-${change.clientId}`;
      const childCount = nodes.filter((n) => n.parentId === frameId).length;
      const routerCount = changes.filter(
        (c) => c.type === "create-router" && c.networkClientId === change.clientId,
      ).length;
      if (childCount)
        effects.push(
          `Detaches ${plural(childCount, "resource")} to “No Network”`,
        );
      if (routerCount)
        effects.push(`Drops ${plural(routerCount, "routing-peer change")}`);
      return {
        summary: `Remove the new network “${change.name}”?`,
        effects,
      };
    }

    case "create-resource": {
      const policyCount = changes.filter(
        (c) =>
          (c.type === "create-policy" || c.type === "update-policy") &&
          c.policy.rules?.some(
            (r) =>
              r.sourceResource?.id === change.clientId ||
              r.destinationResource?.id === change.clientId,
          ),
      ).length;
      if (policyCount)
        effects.push(`Removes it from ${plural(policyCount, "policy", "policies")}`);
      return {
        summary: `Remove the new resource “${change.name}”?`,
        effects,
      };
    }

    case "install-peer": {
      if (change.installedPeerId) {
        return {
          summary: `Remove the installed peer “${change.name}” from this list?`,
          effects: ["The peer itself stays on the canvas and in your network"],
        };
      }
      const nodeId = `peer-${change.clientId}`;
      const policyCount = policiesTouchingNode(nodeId).size;
      const routerCount = changes.filter(
        (c) =>
          (c.type === "create-router" || c.type === "update-router") &&
          c.peerId === change.clientId,
      ).length;
      if (policyCount)
        effects.push(`Removes it from ${plural(policyCount, "policy", "policies")}`);
      if (routerCount)
        effects.push(`Drops ${plural(routerCount, "routing-peer change")}`);
      effects.push("Deletes its generated setup key");
      return {
        summary: `Remove the peer “${change.name}”?`,
        effects,
      };
    }

    case "delete-network":
      return {
        summary: `Restore the network “${change.name}”?`,
        effects: ["Re-adds it and its resources to the canvas"],
      };
    case "delete-group":
      return {
        summary: `Restore the group “${change.name}”?`,
        effects: ["Re-adds it to the canvas and its policies"],
      };
    case "delete-policy":
      return {
        summary: `Restore the policy “${change.name}”?`,
        effects: ["Re-adds it to the canvas"],
      };
    case "delete-resource":
      return {
        summary: `Restore the resource “${change.name}”?`,
        effects: ["Re-adds it to the canvas"],
      };

    case "update-router":
      return {
        summary: `Revert your changes to “${
          change.peerName ?? change.groupName ?? "routing peer"
        }”?`,
        effects: ["Restores the live values on the canvas"],
      };
    case "update-group":
    case "update-network":
    case "update-policy":
    case "update-resource":
      return {
        summary: `Revert your changes to “${change.name}”?`,
        effects: ["Restores the live values on the canvas"],
      };

    case "create-policy":
      return { summary: `Remove the new policy “${change.name}”?`, effects };
    case "create-router":
      return {
        summary: `Remove the routing peer “${
          change.peerName ?? change.groupName ?? ""
        }”?`,
        effects,
      };
    default:
      return { summary: "Remove this change?", effects };
  }
}
