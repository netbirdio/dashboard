import { Group } from "@/interfaces/Group";
import {
  DraftChange,
  isNoopGroupUpdate,
} from "@/modules/control-center/draft/DraftChangesetContext";

// Removing a changeset entry must leave the draft as if the change had never
// been made. The canvas half lives in hooks/useRemoveChange.ts.

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
      return [
        {
          ...c,
          policy: {
            ...c.policy,
            rules: c.policy.rules?.map((r) => ({
              ...r,
              sources: dropGroupFromRule(r.sources, name) as any,
              destinations: dropGroupFromRule(r.destinations, name) as any,
              // authorized_groups is keyed by group name, not id.
              ...(r.authorized_groups
                ? {
                    authorized_groups: Object.fromEntries(
                      Object.entries(r.authorized_groups).filter(
                        ([key]) => key !== name,
                      ),
                    ),
                  }
                : {}),
            })),
          },
        },
      ];
    }
    return [c];
  });
}

const clearResourceRef = (change: DraftChange, refId: string): DraftChange => {
  if (change.type !== "create-policy" && change.type !== "update-policy") {
    return change;
  }
  return {
    ...change,
    policy: {
      ...change.policy,
      rules: change.policy.rules?.map((r) => ({
        ...r,
        sourceResource:
          r.sourceResource?.id === refId ? undefined : r.sourceResource,
        destinationResource:
          r.destinationResource?.id === refId
            ? undefined
            : r.destinationResource,
      })),
    },
  };
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

    case "create-network": {
      // Contained resources detach to standalone instead of being deleted.
      const clientId = change.clientId;
      return withoutTarget.flatMap((c): DraftChange[] => {
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
            (n.data?.group && n.data.group.name === change.name),
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
