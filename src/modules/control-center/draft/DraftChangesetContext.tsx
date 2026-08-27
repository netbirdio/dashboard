"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Group } from "@/interfaces/Group";
import { Permission } from "@/interfaces/Permission";
import { Policy } from "@/interfaces/Policy";
import {
  deletedGroupRefs,
  detachChangesFromDraftNetwork,
  isEmptiedPolicy,
  isNoopGroupUpdate,
  isPendingPolicyWrite,
  mergeGroupDeletions,
  pendingGroupDeletions,
  reduceRemoveChange,
} from "@/modules/control-center/utils/change-cascade";
import { draftUid } from "@/modules/control-center/utils/helpers";

export {
  isEmptiedPolicy,
  isPendingPolicyWrite,
  mergeGroupDeletions,
} from "@/modules/control-center/utils/change-cascade";

// Nothing hits the API until the changeset is deployed; changes coalesce per entity.

export interface CreateGroupChange {
  id: string;
  type: "create-group";
  // Canvas node id; the group has no API id until deploy.
  clientId: string;
  name: string;
  peerIds: string[];
  resourceIds: string[];
}

export interface UpdateGroupChange {
  id: string;
  type: "update-group";
  groupId: string;
  name: string;
  originalName: string;
  peerIds: string[];
  resourceIds: string[];
  // EXISTING members only; draft-added members just leave the add lists above.
  removedPeerIds?: string[];
  removedResourceIds?: string[];
}

export interface DeleteGroupChange {
  id: string;
  type: "delete-group";
  groupId: string;
  name: string;
}

export interface CreatePolicyChange {
  id: string;
  type: "create-policy";
  // Pseudo policy id used on canvas (e.g. new-<uuid> → node policy-new-<uuid>).
  clientId: string;
  name: string;
  // Rules reference groups as objects; new groups are resolved by name on deploy.
  policy: Policy;
  groupDeletion?: PolicyGroupDeletion;
}

// Set when a group deletion had to leave this policy. `basePolicy` is the policy
// BEFORE the strip; a hand edit rebases the tag (see mergeGroupDeletions).
export type PolicyGroupDeletion = {
  groupIds: string[];
  basePolicy: Policy;
  handEdited?: boolean;
};

export interface UpdatePolicyChange {
  id: string;
  type: "update-policy";
  policyId: string;
  name: string;
  policy: Policy;
  // Only affects the label: toggle reads Enable/Disable, edit Update.
  origin: "toggle" | "edit";
  groupDeletion?: PolicyGroupDeletion;
}

export interface DeletePolicyChange {
  id: string;
  type: "delete-policy";
  policyId: string;
  name: string;
  groupDeletion?: PolicyGroupDeletion;
}

export interface CreateNetworkChange {
  id: string;
  type: "create-network";
  // Canvas node id network-new-<uuid> → clientId "new-<uuid>".
  clientId: string;
  name: string;
  description?: string;
}

// Edits to an EXISTING (API) network; draft networks fold edits into their create.
export interface UpdateNetworkChange {
  id: string;
  type: "update-network";
  networkId: string;
  name: string;
  originalName: string;
  description?: string;
  originalDescription?: string;
}

// An incomplete draft resource stays canvas-only.
export interface CreateResourceChange {
  id: string;
  type: "create-resource";
  clientId: string;
  name: string;
  description?: string;
  address: string;
  // Parent network: API id, or a draft network's clientId (resolved on deploy).
  networkId?: string;
  networkClientId?: string;
  networkName: string;
  // API group ids or draft-group names, resolved on deploy.
  groupIds: string[];
  // Defaults to enabled when absent.
  enabled?: boolean;
}

// Routers on a placeholder peer stay OUT until it installs with a real id.
export interface CreateRouterChange {
  id: string;
  type: "create-router";
  clientId: string;
  networkId?: string;
  networkClientId?: string;
  networkName: string;
  // Exactly one of the two. groupId may be a draft-group name.
  peerId?: string;
  groupId?: string;
  peerName?: string;
  groupName?: string;
  // Deploy falls back to the live-modal defaults (9999 / true / true).
  metric?: number;
  masquerade?: boolean;
  enabled?: boolean;
}

// Edits to an EXISTING (API) router; draft routers re-record their create instead.
export interface UpdateRouterChange {
  id: string;
  type: "update-router";
  routerId: string;
  networkId: string;
  networkName: string;
  peerId?: string;
  groupId?: string;
  peerName?: string;
  groupName?: string;
  metric?: number;
  masquerade?: boolean;
  enabled?: boolean;
}

// Edits to an EXISTING (API) resource; deploy PUTs the full resource.
export interface UpdateResourceChange {
  id: string;
  type: "update-resource";
  resourceId: string;
  networkId: string;
  name: string;
  networkName: string;
  address: string;
  description?: string;
  enabled: boolean;
  groupIds: string[];
}

export interface DeleteResourceChange {
  id: string;
  type: "delete-resource";
  resourceId: string;
  networkId: string;
  name: string;
  networkName: string;
}

export interface DeleteNetworkChange {
  id: string;
  type: "delete-network";
  networkId: string;
  name: string;
}

export interface InstallPeerChange {
  id: string;
  type: "install-peer";
  // The placeholder's draft peer id ("draft-<uuid>").
  clientId: string;
  name: string;
  kind: "user-device" | "server" | "agent";
  // Set once a setup key is generated: the peer is waiting to register.
  setupKeyId?: string;
  installedPeerId?: string;
}

export type DraftChange =
  | CreateGroupChange
  | UpdateGroupChange
  | DeleteGroupChange
  | CreatePolicyChange
  | UpdatePolicyChange
  | DeletePolicyChange
  | CreateNetworkChange
  | UpdateNetworkChange
  | CreateResourceChange
  | CreateRouterChange
  | UpdateRouterChange
  | UpdateResourceChange
  | DeleteResourceChange
  | DeleteNetworkChange
  | InstallPeerChange;

// Git-style classification for diff coloring.
export type ChangeKind = "add" | "update" | "remove" | "install";

export const getChangeKind = (change: DraftChange): ChangeKind => {
  switch (change.type) {
    case "create-group":
    case "create-policy":
    case "create-network":
    case "create-resource":
    case "create-router":
      return "add";
    case "delete-resource":
    case "delete-network":
    case "delete-group":
    case "delete-policy":
      return "remove";
    case "update-group":
    case "update-policy":
    case "update-network":
    case "update-router":
    case "update-resource":
      return "update";
    case "install-peer":
      return "install";
  }
};

export const getChangeApiCall = (change: DraftChange): string => {
  switch (change.type) {
    case "create-group":
      return "POST /groups";
    case "update-group":
      return `PUT /groups/${change.groupId}`;
    case "delete-group":
      return `DELETE /groups/${change.groupId}`;
    case "create-policy":
      return "POST /policies";
    case "update-policy":
      return `PUT /policies/${change.policyId}`;
    case "delete-policy":
      return `DELETE /policies/${change.policyId}`;
    case "create-network":
      return "POST /networks";
    case "update-network":
      return `PUT /networks/${change.networkId}`;
    case "create-resource":
      return `POST /networks/${change.networkId ?? "{network_id}"}/resources`;
    case "create-router":
      return `POST /networks/${change.networkId ?? "{network_id}"}/routers`;
    case "update-router":
      return `PUT /networks/${change.networkId}/routers/${change.routerId}`;
    case "update-resource":
      return `PUT /networks/${change.networkId}/resources/${change.resourceId}`;
    case "delete-resource":
      return `DELETE /networks/${change.networkId}/resources/${change.resourceId}`;
    case "delete-network":
      return `DELETE /networks/${change.networkId}`;
    case "install-peer":
      // Not a deploy call: the setup key is created when the user installs.
      return "POST /setup-keys";
  }
};

export const getChangeLabel = (
  change: DraftChange,
): { title: string; detail?: string } => {
  switch (change.type) {
    case "create-group": {
      const parts = [];
      if (change.peerIds.length > 0)
        parts.push(
          `${change.peerIds.length} peer${change.peerIds.length !== 1 ? "s" : ""}`,
        );
      if (change.resourceIds.length > 0)
        parts.push(
          `${change.resourceIds.length} resource${
            change.resourceIds.length !== 1 ? "s" : ""
          }`,
        );
      return {
        title: `Create group “${change.name}”`,
        detail: parts.length > 0 ? `with ${parts.join(", ")}` : undefined,
      };
    }
    case "update-group": {
      const parts = [];
      if (change.name !== change.originalName)
        parts.push(`renamed from “${change.originalName}”`);
      const count = change.peerIds.length + change.resourceIds.length;
      if (count > 0) parts.push(`+${count} member${count !== 1 ? "s" : ""}`);
      const removed =
        (change.removedPeerIds?.length ?? 0) +
        (change.removedResourceIds?.length ?? 0);
      if (removed > 0)
        parts.push(`−${removed} member${removed !== 1 ? "s" : ""}`);
      return {
        title: `Update group “${change.name}”`,
        detail: parts.length > 0 ? parts.join(", ") : undefined,
      };
    }
    case "delete-group":
      return { title: `Delete group “${change.name}”` };
    case "update-policy": {
      if (change.origin === "toggle") {
        return {
          title: `${change.policy.enabled ? "Enable" : "Disable"} policy “${
            change.name
          }”`,
        };
      }
    }
     
    case "create-policy": {
      const rule = change.policy.rules?.[0];
      const names = (groups?: Group[] | string[] | null) =>
        ((groups as Group[]) ?? [])
          .map((g) => (typeof g === "string" ? g : g.name))
          .join(", ");
      const source = rule?.sourceResource ? "Resource" : names(rule?.sources);
      const destination = rule?.destinationResource
        ? "Resource"
        : names(rule?.destinations);
      return {
        title: `${
          change.type === "create-policy" ? "Create" : "Update"
        } policy “${change.name}”`,
        detail:
          source || destination ? `${source} → ${destination}` : undefined,
      };
    }
    case "delete-policy":
      return { title: `Delete policy “${change.name}”` };
    case "create-network":
      return {
        title: `Create network “${change.name}”`,
        detail: change.description || undefined,
      };
    case "update-network": {
      const parts = [];
      if (change.name !== change.originalName)
        parts.push(`renamed from “${change.originalName}”`);
      if ((change.description ?? "") !== (change.originalDescription ?? ""))
        parts.push("description changed");
      return {
        title: `Update network “${change.name}”`,
        detail: parts.length > 0 ? parts.join(", ") : undefined,
      };
    }
    case "create-resource":
      return {
        title: change.networkName
          ? `Create resource “${change.name}” in “${change.networkName}”`
          : `Create resource “${change.name}”`,
        detail: change.address,
      };
    case "create-router":
      return {
        title: change.peerId
          ? `Add routing peer “${change.peerName ?? change.peerId}” to “${change.networkName}”`
          : `Add routing peer group “${change.groupName ?? change.groupId}” to “${change.networkName}”`,
      };
    case "update-router":
      return {
        title: change.peerId
          ? `Update routing peer “${change.peerName ?? change.peerId}” in “${change.networkName}”`
          : `Update routing peer group “${change.groupName ?? change.groupId}” in “${change.networkName}”`,
      };
    case "update-resource":
      return {
        title: `${change.enabled ? "Enable" : "Disable"} resource “${
          change.name
        }” in “${change.networkName}”`,
      };
    case "delete-resource":
      return {
        title: `Delete resource “${change.name}” from “${change.networkName}”`,
      };
    case "delete-network":
      return {
        title: `Delete network “${change.name}”`,
        detail: "its resources and routing peers are removed too",
      };
    case "install-peer":
      if (change.installedPeerId) {
        return {
          title: `Peer “${change.name}” installed`,
          detail: "it joined your network — nothing left to deploy for it",
        };
      }
      return {
        title: `Install peer “${change.name}”`,
        detail:
          change.kind === "user-device"
            ? "select an existing peer or install a new one"
            : "install to complete the draft changes that reference it",
      };
  }
};

// A blocking issue keeps the change in the set but prevents deploying.
export type ChangeIssue = {
  label: string;
  message: string;
  // Non-blocking "in progress" issue: the badge shows a spinner.
  waiting?: boolean;
  // Set when Review & Deploy can open a fix for it; an issue about ANOTHER change
  // has no fix on this row.
  resolvable?: boolean;
};

// `changes` is not optional: several issues are about how this change sits
// against the REST of the changeset.
export const getChangeIssue = (
  change: DraftChange,
  changes: DraftChange[],
): ChangeIssue | undefined => {
  // Stripped bare by a group deletion; blocked here so the deploy never
  // refuses it mid-run.
  if (change.type === "create-policy" && isEmptiedPolicy(change.policy)) {
    return {
      label: "Incomplete",
      message: `Policy “${change.name}” lost a side to a group deletion. Give it a source and a destination, or remove it.`,
      resolvable: true,
    };
  }
  // A canvas removal can leave a pending edit's policy one-sided.
  if (change.type === "update-policy" && isEmptiedPolicy(change.policy)) {
    return {
      label: "Incomplete",
      message: `Policy “${change.name}” is missing a source or a destination. Give it both, or remove this change to revert to the live policy.`,
      resolvable: true,
    };
  }
  if (
    change.type === "create-resource" &&
    !change.networkId &&
    !change.networkClientId
  ) {
    return {
      label: "No Network",
      message: `Resource “${change.name}” has no network assigned. Assign it to a network before deploying.`,
      resolvable: true,
    };
  }
  // A group marked for deletion that this resource or router still names: both
  // deploy BEFORE the delete, and a landed reference fails the DELETE for good.
  const doomedGroups = pendingGroupDeletions(changes);
  const deletedGroups = deletedGroupRefs(change, doomedGroups);
  if (deletedGroups.length > 0) {
    const list = deletedGroups
      .map((id) => `“${doomedGroups.get(id)}”`)
      .join(", ");
    const subject =
      change.type === "create-resource" || change.type === "update-resource"
        ? `Resource “${change.name}”`
        : change.type === "create-router" || change.type === "update-router"
        ? `Routing peer in “${change.networkName}”`
        : "This change";
    return {
      label: "Group deleted",
      message: `${subject} references ${
        deletedGroups.length === 1 ? "group" : "groups"
      } ${list}, marked for deletion in this draft. The deletion is refused while anything references ${
        deletedGroups.length === 1 ? "it" : "them"
      } — take the group off this change, or discard the deletion.`,
    };
  }
  if (change.type === "install-peer") {
    if (change.installedPeerId) return undefined;
    // A peer waiting to register still blocks deploy until it upgrades.
    if (change.setupKeyId) {
      return {
        label: "Waiting",
        waiting: true,
        message: `Waiting for “${change.name}” to register after install.`,
        resolvable: true,
      };
    }
    return {
      label: "Install",
      message:
        change.kind === "user-device"
          ? `Peer “${change.name}” must be installed or selected before deploying.`
          : `Peer “${change.name}” must be installed before deploying.`,
      resolvable: true,
    };
  }
  return undefined;
};

export const hasBlockingIssues = (changes: DraftChange[]): boolean =>
  changes.some((c) => getChangeIssue(c, changes) !== undefined);

// The permission each change type's request needs. Draft mode defers the write, it
// does not exempt it; install-peer is the user's own manual step, not a deploy call.
export const CHANGE_PERMISSION: Record<
  Exclude<DraftChange["type"], "install-peer">,
  { module: "groups" | "policies" | "networks"; action: keyof Permission }
> = {
  "create-group": { module: "groups", action: "create" },
  "update-group": { module: "groups", action: "update" },
  "delete-group": { module: "groups", action: "delete" },
  "create-policy": { module: "policies", action: "create" },
  "update-policy": { module: "policies", action: "update" },
  "delete-policy": { module: "policies", action: "delete" },
  // Resources and routers are addressed under a network and share its module.
  "create-network": { module: "networks", action: "create" },
  "update-network": { module: "networks", action: "update" },
  "delete-network": { module: "networks", action: "delete" },
  "create-resource": { module: "networks", action: "create" },
  "update-resource": { module: "networks", action: "update" },
  "delete-resource": { module: "networks", action: "delete" },
  "create-router": { module: "networks", action: "create" },
  "update-router": { module: "networks", action: "update" },
};

// Canonical CRUD dependency order, shared by deploy and Review & Deploy.
export const CHANGE_DEPLOY_ORDER: DraftChange["type"][] = [
  "create-group",
  "update-group",
  "create-network",
  "update-network",
  "create-resource",
  "update-resource",
  "create-router",
  "update-router",
  "create-policy",
  "update-policy",
  "delete-policy",
  "delete-resource",
  // Cascades its resources/routers server-side, so it runs last.
  "delete-network",
  "delete-group",
];

// Canvas-only states that silently withhold changes from deploy.
export const getCanvasWarnings = (
  nodes: {
    id: string;
    type?: string;
    data?: Record<string, unknown>;
  }[],
  changes: DraftChange[],
): string[] => {
  const warnings: string[] = [];
  const trackedResourceIds = new Set(
    changes
      .filter((c): c is CreateResourceChange => c.type === "create-resource")
      .map((c) => c.clientId),
  );

  nodes.forEach((n) => {
    if (n.type === "policyNode") {
      const policy = n.data?.policy as Policy | undefined;
      const rule = policy?.rules?.[0];
      if (!rule) return;
      const hasBothSides =
        ((rule.sources?.length ?? 0) > 0 || !!rule.sourceResource) &&
        ((rule.destinations?.length ?? 0) > 0 || !!rule.destinationResource);
      // Incomplete policies are visibly unfinished, so no warning is needed.
      if (!hasBothSides) return;
      const refs = [rule.sourceResource, rule.destinationResource];
      if (refs.some((r) => r?.id?.startsWith("draft-"))) {
        warnings.push(
          `Policy “${policy?.name ?? "Policy"}” references a peer that isn't installed yet and won't deploy until it is.`,
        );
      } else if (
        refs.some(
          (r) => r?.id?.startsWith("new-") && !trackedResourceIds.has(r.id),
        )
      ) {
        warnings.push(
          `Policy “${policy?.name ?? "Policy"}” references a resource without a network and won't deploy until it is assigned to one.`,
        );
      }
    }
    if (n.id.startsWith("resource-new-")) {
      const clientId = n.id.replace("resource-", "");
      if (!trackedResourceIds.has(clientId)) {
        const resource = n.data?.resource as { name?: string } | undefined;
        warnings.push(
          `Resource “${resource?.name ?? "Resource"}” has no network assigned and won't deploy.`,
        );
      }
    }
  });

  return warnings;
};

// A draft-only group has no API id, so it is referenced by its (unique) name.
type GroupRef = {
  groupId?: string;
};

interface DraftChangesetContextType {
  changes: DraftChange[];
  changeCount: number;
  trackCreateGroup: (params: {
    clientId: string;
    name: string;
    peerIds?: string[];
    resourceIds?: string[];
  }) => void;
  trackRenameGroup: (params: GroupRef & { from: string; to: string }) => void;
  trackAddGroupMembers: (
    params: GroupRef & {
      groupName: string;
      peerIds?: string[];
      resourceIds?: string[];
    },
  ) => void;
  trackRemoveGroupMembers: (
    params: GroupRef & {
      groupName: string;
      peerIds?: string[];
      resourceIds?: string[];
      // Only cancels a pending draft ADD; never records the removal of a live
      // member and never creates a change where none exists.
      pendingOnly?: boolean;
    },
  ) => void;
  trackDeleteGroup: (params: GroupRef & { name: string }) => void;
  untrackNewGroup: (name: string) => void;
  // Used when a placeholder ("draft-…") upgrades to a real peer.
  replacePeerIdInGroups: (oldId: string, newId: string, newName?: string) => void;
  trackCreateNetwork: (params: {
    clientId: string;
    name: string;
    description?: string;
  }) => void;
  updateDraftNetwork: (params: {
    clientId: string;
    name: string;
    description?: string;
  }) => void;
  untrackNetwork: (clientId: string) => void;
  trackUpdateNetwork: (
    params: Omit<UpdateNetworkChange, "id" | "type">,
  ) => void;
  // Upserts by clientId; the editor always saves the full resource.
  trackCreateResource: (params: Omit<CreateResourceChange, "id" | "type">) => void;
  untrackResource: (clientId: string) => void;
  trackUpdateResource: (
    params: Omit<UpdateResourceChange, "id" | "type"> & {
      original?: {
        enabled: boolean;
        name: string;
        address: string;
        description?: string;
        groupIds: string[];
      };
    },
  ) => void;
  // Supersedes a pending update for the same resource.
  trackDeleteResource: (
    params: Omit<DeleteResourceChange, "id" | "type">,
  ) => void;
  trackDeleteNetwork: (
    params: Omit<DeleteNetworkChange, "id" | "type">,
  ) => void;
  // Deploy applies these via the resource's own `groups` field: group changes
  // deploy before the resource exists.
  addGroupToDraftResource: (clientId: string, groupRef: string) => void;
  removeGroupFromDraftResource: (clientId: string, groupRef: string) => void;
  trackCreateRouter: (params: Omit<CreateRouterChange, "id" | "type">) => void;
  // Supersedes an earlier edit of the same router.
  trackUpdateRouter: (
    params: Omit<UpdateRouterChange, "id" | "type">,
  ) => void;
  trackCreatePolicy: (params: { clientId: string; policy: Policy }) => void;
  // `groupDeletion` marks a write forced by a group deletion. An ordinary edit
  // leaves it unset, which REBASES the tag onto the edit — see mergeGroupDeletions.
  trackUpdatePolicy: (params: {
    policyId: string;
    policy: Policy;
    groupDeletion?: PolicyGroupDeletion;
  }) => void;
  // Re-records a PENDING update-policy; a no-op when none exists. Unlike
  // trackUpdatePolicy it never reads an emptied policy as a deletion.
  patchPendingPolicyUpdate: (params: { policyId: string; policy: Policy }) => void;
  // Folded into a pending create/update change when one exists.
  trackSetPolicyEnabled: (params: {
    policyId: string;
    name: string;
    enabled: boolean;
    originalEnabled: boolean;
    policy: Policy;
  }) => void;
  trackDeletePolicy: (params: { policyId: string; name: string }) => void;
  // Upserted by clientId; renames update the entry.
  trackInstallPeer: (params: {
    clientId: string;
    name: string;
    kind: InstallPeerChange["kind"];
  }) => void;
  markInstallPeerWaiting: (clientId: string, setupKeyId: string) => void;
  // The key this entry was waiting on is dead, so the row goes back to "needs a
  // key" rather than waiting on a registration that can never arrive.
  clearInstallPeerKey: (clientId: string) => void;
  markInstallPeerInstalled: (
    clientId: string,
    peer: { id: string; name?: string },
  ) => void;
  untrackInstallPeer: (clientId: string) => void;
  removeChange: (id: string) => void;
  clearChanges: () => void;
  replaceChanges: (changes: DraftChange[]) => void;
}

const DraftChangesetContext = createContext<DraftChangesetContextType | null>(
  null,
);

export function useDraftChangeset(): DraftChangesetContextType {
  const ctx = useContext(DraftChangesetContext);
  if (!ctx) {
    throw new Error(
      "useDraftChangeset must be used within DraftChangesetProvider",
    );
  }
  return ctx;
}

// Draft groups are referenced by NAME, so a rename must follow into the changes.
const renameGroupInPolicies = (
  changes: DraftChange[],
  from: string,
  to: string,
): DraftChange[] =>
  changes.map((c) => {
    if (
      (c.type === "create-resource" || c.type === "update-resource") &&
      c.groupIds.includes(from)
    ) {
      return {
        ...c,
        groupIds: c.groupIds.map((id) => (id === from ? to : id)),
      };
    }
    if (
      (c.type === "create-router" || c.type === "update-router") &&
      c.groupId === from
    ) {
      return { ...c, groupId: to, groupName: to };
    }
    if (c.type !== "create-policy" && c.type !== "update-policy") return c;
    const rename = (groups?: Group[] | string[] | null) =>
      groups
        ? (groups as Group[]).map((g) =>
            typeof g !== "string" && g.name === from ? { ...g, name: to } : g,
          )
        : groups;
    return {
      ...c,
      policy: {
        ...c.policy,
        rules: c.policy.rules?.map((r) => ({
          ...r,
          sources: rename(r.sources) as any,
          destinations: rename(r.destinations) as any,
        })),
      },
    };
  });

export function DraftChangesetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Changes live only in React state: a reload loses the draft.
  const [changes, setChanges] = useState<DraftChange[]>([]);

  useEffect(() => {
    if (process.env.APP_ENV === "test") {
      (
        window as unknown as { __ccDraftChanges?: DraftChange[] }
      ).__ccDraftChanges = changes;
    }
  }, [changes]);

  const trackCreateGroup = useCallback(
    ({
      clientId,
      name,
      peerIds = [],
      resourceIds = [],
    }: {
      clientId: string;
      name: string;
      peerIds?: string[];
      resourceIds?: string[];
    }) => {
      setChanges((prev) => [
        ...prev,
        { id: draftUid(), type: "create-group", clientId, name, peerIds, resourceIds },
      ]);
    },
    [],
  );

  const trackRenameGroup = useCallback(
    ({ groupId, from, to }: GroupRef & { from: string; to: string }) => {
      setChanges((prev) => {
        let next: DraftChange[];
        if (!groupId) {
          next = prev.map((c) =>
            c.type === "create-group" && c.name === from
              ? { ...c, name: to }
              : c,
          );
        } else {
          const existing = prev.find(
            (c): c is UpdateGroupChange =>
              c.type === "update-group" && c.groupId === groupId,
          );
          if (existing) {
            const reverted =
              to === existing.originalName &&
              existing.peerIds.length === 0 &&
              existing.resourceIds.length === 0 &&
              (existing.removedPeerIds?.length ?? 0) === 0 &&
              (existing.removedResourceIds?.length ?? 0) === 0;
            next = reverted
              ? prev.filter((c) => c.id !== existing.id)
              : prev.map((c) =>
                  c.id === existing.id ? { ...existing, name: to } : c,
                );
          } else {
            next = [
              ...prev,
              {
                id: draftUid(),
                type: "update-group",
                groupId,
                name: to,
                originalName: from,
                peerIds: [],
                resourceIds: [],
              },
            ];
          }
        }
        return renameGroupInPolicies(next, from, to);
      });
    },
    [],
  );

  const trackAddGroupMembers = useCallback(
    ({
      groupId,
      groupName,
      peerIds = [],
      resourceIds = [],
    }: GroupRef & {
      groupName: string;
      peerIds?: string[];
      resourceIds?: string[];
    }) => {
      setChanges((prev) => {
        if (!groupId) {
          return prev.map((c) =>
            c.type === "create-group" && c.name === groupName
              ? {
                  ...c,
                  peerIds: [...new Set([...c.peerIds, ...peerIds])],
                  resourceIds: [
                    ...new Set([...c.resourceIds, ...resourceIds]),
                  ],
                }
              : c,
          );
        }
        const existing = prev.find(
          (c): c is UpdateGroupChange =>
            c.type === "update-group" && c.groupId === groupId,
        );
        if (existing) {
          // Re-adding a draft-removed member is a pure revert: it is still live,
          // so it only leaves the removed list.
          const revertedPeers = new Set(
            peerIds.filter((id) => existing.removedPeerIds?.includes(id)),
          );
          const revertedResources = new Set(
            resourceIds.filter((id) =>
              existing.removedResourceIds?.includes(id),
            ),
          );
          const updated: UpdateGroupChange = {
            ...existing,
            peerIds: [
              ...new Set([
                ...existing.peerIds,
                ...peerIds.filter((id) => !revertedPeers.has(id)),
              ]),
            ],
            resourceIds: [
              ...new Set([
                ...existing.resourceIds,
                ...resourceIds.filter((id) => !revertedResources.has(id)),
              ]),
            ],
            removedPeerIds: existing.removedPeerIds?.filter(
              (id) => !peerIds.includes(id),
            ),
            removedResourceIds: existing.removedResourceIds?.filter(
              (id) => !resourceIds.includes(id),
            ),
          };
          return isNoopGroupUpdate(updated)
            ? prev.filter((c) => c.id !== existing.id)
            : prev.map((c) => (c.id === existing.id ? updated : c));
        }
        return [
          ...prev,
          {
            id: draftUid(),
            type: "update-group",
            groupId,
            name: groupName,
            originalName: groupName,
            peerIds,
            resourceIds,
          },
        ];
      });
    },
    [],
  );

  const trackRemoveGroupMembers = useCallback(
    ({
      groupId,
      groupName,
      peerIds = [],
      resourceIds = [],
      pendingOnly = false,
    }: GroupRef & {
      groupName: string;
      peerIds?: string[];
      resourceIds?: string[];
      pendingOnly?: boolean;
    }) => {
      setChanges((prev) => {
        if (!groupId) {
          return prev.map((c) =>
            c.type === "create-group" && c.name === groupName
              ? {
                  ...c,
                  peerIds: c.peerIds.filter((id) => !peerIds.includes(id)),
                  resourceIds: c.resourceIds.filter(
                    (id) => !resourceIds.includes(id),
                  ),
                }
              : c,
          );
        }
        const existing = prev.find(
          (c): c is UpdateGroupChange =>
            c.type === "update-group" && c.groupId === groupId,
        );
        const applyTo = (c: UpdateGroupChange): UpdateGroupChange => {
          // Ids in the add lists were draft-added; the rest are existing members.
          const next: UpdateGroupChange = {
            ...c,
            peerIds: c.peerIds.filter((id) => !peerIds.includes(id)),
            resourceIds: c.resourceIds.filter(
              (id) => !resourceIds.includes(id),
            ),
            ...(pendingOnly
              ? {}
              : {
                  removedPeerIds: [
                    ...new Set([
                      ...(c.removedPeerIds ?? []),
                      ...peerIds.filter((id) => !c.peerIds.includes(id)),
                    ]),
                  ],
                  removedResourceIds: [
                    ...new Set([
                      ...(c.removedResourceIds ?? []),
                      ...resourceIds.filter(
                        (id) => !c.resourceIds.includes(id),
                      ),
                    ]),
                  ],
                }),
          };
          return next;
        };
        if (existing) {
          const updated = applyTo(existing);
          return isNoopGroupUpdate(updated)
            ? prev.filter((c) => c.id !== existing.id)
            : prev.map((c) => (c.id === existing.id ? updated : c));
        }
        if (pendingOnly) return prev;
        return [
          ...prev,
          applyTo({
            id: draftUid(),
            type: "update-group",
            groupId,
            name: groupName,
            originalName: groupName,
            peerIds: [],
            resourceIds: [],
          }),
        ];
      });
    },
    [],
  );

  // Draft groups are referenced BY NAME in resources, routers and policy rules,
  // so dropping the create alone leaves those unresolvable at deploy.
  const untrackNewGroup = useCallback((name: string) => {
    setChanges((prev) => {
      const target = prev.find(
        (c) => c.type === "create-group" && c.name === name,
      );
      return target ? reduceRemoveChange(prev, target) : prev;
    });
  }, []);

  const replacePeerIdInGroups = useCallback(
    (oldId: string, newId: string, newName?: string) => {
      setChanges((prev) => {
        const mapped = prev.map((c) => {
          if (c.type === "create-router" && c.peerId === oldId) {
            return { ...c, peerId: newId, peerName: newName ?? c.peerName };
          }
          if (c.type !== "create-group" && c.type !== "update-group") return c;
          if (!c.peerIds.includes(oldId)) return c;
          return {
            ...c,
            peerIds: [
              ...new Set(c.peerIds.map((id) => (id === oldId ? newId : id))),
            ],
          };
        });
        // The real id can collide with a router already recorded for the same
        // (network, peer); drop the dup so deploy POSTs it once.
        const seen = new Set<string>();
        return mapped.filter((c) => {
          if (c.type !== "create-router") return true;
          const key = `${c.networkId ?? c.networkClientId}|${
            c.peerId ?? ""
          }|${c.groupId ?? ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
    },
    [],
  );

  const trackCreateNetwork = useCallback(
    ({
      clientId,
      name,
      description,
    }: {
      clientId: string;
      name: string;
      description?: string;
    }) => {
      setChanges((prev) => [
        ...prev,
        { id: draftUid(), type: "create-network", clientId, name, description },
      ]);
    },
    [],
  );

  const updateDraftNetwork = useCallback(
    ({
      clientId,
      name,
      description,
    }: {
      clientId: string;
      name: string;
      description?: string;
    }) => {
      setChanges((prev) =>
        prev.map((c) => {
          if (c.type === "create-network" && c.clientId === clientId) {
            return { ...c, name, description };
          }
          // Dependent resource/router labels follow the rename.
          if (
            (c.type === "create-resource" || c.type === "create-router") &&
            c.networkClientId === clientId
          ) {
            return { ...c, networkName: name };
          }
          return c;
        }),
      );
    },
    [],
  );

  // Same cascade as discarding the create-network change.
  const untrackNetwork = useCallback((clientId: string) => {
    setChanges((prev) =>
      detachChangesFromDraftNetwork(
        prev.filter(
          (c) => !(c.type === "create-network" && c.clientId === clientId),
        ),
        clientId,
      ),
    );
  }, []);

  // Reverting name AND description back to the live values drops the change.
  const trackUpdateNetwork = useCallback(
    (params: Omit<UpdateNetworkChange, "id" | "type">) => {
      setChanges((prev) => {
        const revert =
          params.name === params.originalName &&
          (params.description ?? "") === (params.originalDescription ?? "");
        const existing = prev.find(
          (c): c is UpdateNetworkChange =>
            c.type === "update-network" && c.networkId === params.networkId,
        );
        if (revert) {
          return existing ? prev.filter((c) => c.id !== existing.id) : prev;
        }
        if (existing) {
          return prev.map((c) =>
            c.id === existing.id ? { ...existing, ...params } : c,
          );
        }
        return [...prev, { id: draftUid(), type: "update-network", ...params }];
      });
    },
    [],
  );

  const trackCreateResource = useCallback(
    (params: Omit<CreateResourceChange, "id" | "type">) => {
      setChanges((prev) => {
        const existing = prev.find(
          (c): c is CreateResourceChange =>
            c.type === "create-resource" && c.clientId === params.clientId,
        );
        if (existing) {
          return prev.map((c) =>
            c.id === existing.id ? { ...existing, ...params } : c,
          );
        }
        return [...prev, { id: draftUid(), type: "create-resource", ...params }];
      });
    },
    [],
  );

  const untrackResource = useCallback((clientId: string) => {
    setChanges((prev) =>
      prev
        .filter(
          (c) => !(c.type === "create-resource" && c.clientId === clientId),
        )
        // The draft resource can't be a group member anymore.
        .map((c) =>
          (c.type === "create-group" || c.type === "update-group") &&
          c.resourceIds.includes(clientId)
            ? {
                ...c,
                resourceIds: c.resourceIds.filter((id) => id !== clientId),
              }
            : c,
        ),
    );
  }, []);

  const trackUpdateResource = useCallback(
    (
      params: Omit<UpdateResourceChange, "id" | "type"> & {
        // Live (pre-edit) state: a field-for-field revert drops the change.
        original?: {
          enabled: boolean;
          name: string;
          address: string;
          description?: string;
          groupIds: string[];
        };
      },
    ) => {
      const { original, ...change } = params;
      setChanges((prev) => {
        const existing = prev.find(
          (c): c is UpdateResourceChange =>
            c.type === "update-resource" &&
            c.resourceId === change.resourceId,
        );
        const sameIds = (a: string[], b: string[]) =>
          a.length === b.length && [...a].sort().join() === [...b].sort().join();
        const isRevert =
          original &&
          change.enabled === original.enabled &&
          change.name === original.name &&
          change.address === original.address &&
          (change.description ?? "") === (original.description ?? "") &&
          sameIds(change.groupIds, original.groupIds);
        if (isRevert) {
          return existing ? prev.filter((c) => c.id !== existing.id) : prev;
        }
        if (existing) {
          return prev.map((c) =>
            c.id === existing.id ? { ...existing, ...change } : c,
          );
        }
        return [...prev, { id: draftUid(), type: "update-resource", ...change }];
      });
    },
    [],
  );

  const trackDeleteResource = useCallback(
    (params: Omit<DeleteResourceChange, "id" | "type">) => {
      setChanges((prev) => [
        ...prev.filter(
          (c) =>
            !(
              c.type === "update-resource" &&
              c.resourceId === params.resourceId
            ),
        ),
        { id: draftUid(), type: "delete-resource", ...params },
      ]);
    },
    [],
  );

  // The API cascade removes the network's resources and routers, so pending
  // changes scoped to it are dropped.
  const trackDeleteNetwork = useCallback(
    (params: Omit<DeleteNetworkChange, "id" | "type">) => {
      setChanges((prev) => [
        ...prev.filter((c) => {
          if (
            (c.type === "create-resource" ||
              c.type === "update-resource" ||
              c.type === "delete-resource" ||
              c.type === "create-router" ||
              c.type === "update-router" ||
              c.type === "update-network") &&
            c.networkId === params.networkId
          )
            return false;
          return true;
        }),
        { id: draftUid(), type: "delete-network", ...params },
      ]);
    },
    [],
  );

  const addGroupToDraftResource = useCallback(
    (clientId: string, groupRef: string) => {
      setChanges((prev) =>
        prev.map((c) =>
          c.type === "create-resource" &&
          c.clientId === clientId &&
          !c.groupIds.includes(groupRef)
            ? { ...c, groupIds: [...c.groupIds, groupRef] }
            : c,
        ),
      );
    },
    [],
  );

  const removeGroupFromDraftResource = useCallback(
    (clientId: string, groupRef: string) => {
      setChanges((prev) =>
        prev.map((c) =>
          c.type === "create-resource" && c.clientId === clientId
            ? { ...c, groupIds: c.groupIds.filter((g) => g !== groupRef) }
            : c,
        ),
      );
    },
    [],
  );

  const trackCreateRouter = useCallback(
    (params: Omit<CreateRouterChange, "id" | "type">) => {
      setChanges((prev) => {
        // One router per (network, peer/group) pair.
        const duplicate = prev.some(
          (c) =>
            c.type === "create-router" &&
            (c.networkId ?? c.networkClientId) ===
              (params.networkId ?? params.networkClientId) &&
            c.peerId === params.peerId &&
            c.groupId === params.groupId,
        );
        if (duplicate) return prev;
        return [...prev, { id: draftUid(), type: "create-router", ...params }];
      });
    },
    [],
  );

  const trackUpdateRouter = useCallback(
    (params: Omit<UpdateRouterChange, "id" | "type">) => {
      setChanges((prev) => {
        const existing = prev.find(
          (c): c is UpdateRouterChange =>
            c.type === "update-router" && c.routerId === params.routerId,
        );
        if (existing) {
          return prev.map((c) =>
            c.id === existing.id ? { ...existing, ...params } : c,
          );
        }
        return [...prev, { id: draftUid(), type: "update-router", ...params }];
      });
    },
    [],
  );

  const trackDeleteGroup = useCallback(
    ({ groupId, name }: GroupRef & { name: string }) => {
      setChanges((prev) => {
        if (!groupId) {
          // Same cascade as untrackNewGroup.
          const target = prev.find(
            (c) => c.type === "create-group" && c.name === name,
          );
          return target ? reduceRemoveChange(prev, target) : prev;
        }
        // A pending update is moot once the group is deleted.
        const filtered = prev.filter(
          (c) => !(c.type === "update-group" && c.groupId === groupId),
        );
        return [
          ...filtered,
          { id: draftUid(), type: "delete-group", groupId, name },
        ];
      });
    },
    [],
  );

  const trackCreatePolicy = useCallback(
    ({ clientId, policy }: { clientId: string; policy: Policy }) => {
      setChanges((prev) => [
        ...prev,
        {
          id: draftUid(),
          type: "create-policy",
          clientId,
          name: policy.name ?? "Policy",
          policy,
        },
      ]);
    },
    [],
  );

  const trackUpdatePolicy = useCallback(
    ({
      policyId,
      policy,
      groupDeletion,
    }: {
      policyId: string;
      policy: Policy;
      groupDeletion?: PolicyGroupDeletion;
    }) => {
      setChanges((prev) => {
        const isDraftPolicy = policyId.startsWith("new-");
        const supersededCreate = isDraftPolicy
          ? prev.find(
              (c): c is CreatePolicyChange =>
                c.type === "create-policy" && c.clientId === policyId,
            )
          : undefined;
        const superseded = prev.find(
          (c): c is UpdatePolicyChange | DeletePolicyChange =>
            isPendingPolicyWrite(c) && c.policyId === policyId,
        );
        const supersededTag =
          supersededCreate?.groupDeletion ?? superseded?.groupDeletion;
        // Untagged means the user's own edit or toggle, which must outlive the
        // deletion — see mergeGroupDeletions. A delete-policy holds no such work.
        const supersedesUserWrite =
          !supersededTag &&
          (!!supersededCreate || superseded?.type === "update-policy");
        const isEmptied = isEmptiedPolicy(policy);
        const merged = mergeGroupDeletions(
          supersededTag,
          groupDeletion,
          // Withheld when the policy ends up authorizing nothing: that edit is a
          // request to delete it, and discarding a group deletion must not resurrect it.
          isEmptied ? undefined : policy,
          supersedesUserWrite,
        );
        if (isEmptied) {
          const name = policy.name ?? "Policy";
          if (isDraftPolicy) {
            // Deletion-emptied stays tagged and blocked — nothing restores a departed
            // create-policy; an emptying the user did themselves (no tag) still drops it.
            if (!merged) {
              return prev.filter(
                (c) => !(c.type === "create-policy" && c.clientId === policyId),
              );
            }
            return prev.map((c) =>
              c.type === "create-policy" && c.clientId === policyId
                ? { ...c, name, policy, groupDeletion: merged }
                : c,
            );
          }
          const withoutUpdates = prev.filter(
            (c) => !(c.type === "update-policy" && c.policyId === policyId),
          );
          // A delete already stands; only its tag needs the merge folded in.
          return withoutUpdates.some(
            (c) => c.type === "delete-policy" && c.policyId === policyId,
          )
            ? withoutUpdates.map((c) =>
                c.type === "delete-policy" && c.policyId === policyId
                  ? { ...c, groupDeletion: merged }
                  : c,
              )
            : [
                ...withoutUpdates,
                {
                  id: draftUid(),
                  type: "delete-policy",
                  policyId,
                  name,
                  groupDeletion: merged,
                },
              ];
        }
        // The create change carries the latest data and the tag: only the tag can
        // put a deleted group back when that deletion is discarded.
        if (isDraftPolicy) {
          return prev.map((c) =>
            c.type === "create-policy" && c.clientId === policyId
              ? {
                  ...c,
                  name: policy.name ?? c.name,
                  policy,
                  groupDeletion: merged,
                }
              : c,
          );
        }
        // Supersedes earlier updates/toggles and any pending delete.
        const filtered = prev.filter(
          (c) => !(isPendingPolicyWrite(c) && c.policyId === policyId),
        );
        return [
          ...filtered,
          {
            id: draftUid(),
            type: "update-policy",
            policyId,
            name: policy.name ?? "Policy",
            policy,
            origin: "edit",
            groupDeletion: merged,
          },
        ];
      });
    },
    [],
  );

  const patchPendingPolicyUpdate = useCallback(
    ({ policyId, policy }: { policyId: string; policy: Policy }) => {
      setChanges((prev) =>
        prev.map((c) =>
          c.type === "update-policy" && c.policyId === policyId
            ? { ...c, name: policy.name ?? c.name, policy }
            : c,
        ),
      );
    },
    [],
  );

  const trackSetPolicyEnabled = useCallback(
    ({
      policyId,
      name,
      enabled,
      originalEnabled,
      policy,
    }: {
      policyId: string;
      name: string;
      enabled: boolean;
      originalEnabled: boolean;
      policy: Policy;
    }) => {
      const setEnabled = (p: Policy): Policy => ({
        ...p,
        enabled,
        rules: p.rules?.map((r) => ({ ...r, enabled })),
      });
      setChanges((prev) => {
        if (policyId.startsWith("new-")) {
          return prev.map((c) =>
            c.type === "create-policy" && c.clientId === policyId
              ? {
                  ...c,
                  policy: setEnabled(c.policy),
                  // The baseline has to carry the toggle too, or restoring a
                  // group would rebuild from it and drop the flip.
                  groupDeletion: c.groupDeletion && {
                    ...c.groupDeletion,
                    basePolicy: setEnabled(c.groupDeletion.basePolicy),
                  },
                }
              : c,
          );
        }
        // A policy on its way out has no enabled state worth changing.
        if (
          prev.some(
            (c) => c.type === "delete-policy" && c.policyId === policyId,
          )
        ) {
          return prev;
        }
        const update = prev.find(
          (c): c is UpdatePolicyChange =>
            c.type === "update-policy" && c.policyId === policyId,
        );
        if (update) {
          // A toggle-only change flipped back to the live state disappears.
          if (update.origin === "toggle" && enabled === originalEnabled) {
            return prev.filter((c) => c.id !== update.id);
          }
          return prev.map((c) =>
            c.id === update.id
              ? {
                  ...update,
                  policy: setEnabled(update.policy),
                  // A toggle keeps the group sides, so the tag survives; the baseline
                  // carries the flip (same rule as the update above).
                  groupDeletion: update.groupDeletion && {
                    ...update.groupDeletion,
                    basePolicy: setEnabled(update.groupDeletion.basePolicy),
                  },
                }
              : c,
          );
        }
        if (enabled === originalEnabled) return prev;
        return [
          ...prev,
          {
            id: draftUid(),
            type: "update-policy",
            policyId,
            name,
            policy: setEnabled(policy),
            origin: "toggle",
          },
        ];
      });
    },
    [],
  );

  const trackInstallPeer = useCallback(
    ({
      clientId,
      name,
      kind,
    }: {
      clientId: string;
      name: string;
      kind: InstallPeerChange["kind"];
    }) => {
      setChanges((prev) => {
        const existing = prev.find(
          (c): c is InstallPeerChange =>
            c.type === "install-peer" && c.clientId === clientId,
        );
        if (existing) {
          if (existing.name === name && existing.kind === kind) return prev;
          return prev.map((c) =>
            c.id === existing.id ? { ...existing, name, kind } : c,
          );
        }
        return [
          ...prev,
          { id: draftUid(), type: "install-peer", clientId, name, kind },
        ];
      });
    },
    [],
  );

  const markInstallPeerWaiting = useCallback(
    (clientId: string, setupKeyId: string) => {
      setChanges((prev) =>
        prev.map((c) =>
          c.type === "install-peer" &&
          c.clientId === clientId &&
          c.setupKeyId !== setupKeyId
            ? { ...c, setupKeyId }
            : c,
        ),
      );
    },
    [],
  );

  const clearInstallPeerKey = useCallback((clientId: string) => {
    setChanges((prev) => {
      // Same array when nothing matched: every always-mounted draft consumer
      // re-renders off this list.
      const target = prev.find(
        (c): c is InstallPeerChange =>
          c.type === "install-peer" &&
          c.clientId === clientId &&
          c.setupKeyId !== undefined,
      );
      if (!target) return prev;
      return prev.map((c) =>
        c.id === target.id ? { ...target, setupKeyId: undefined } : c,
      );
    });
  }, []);

  const markInstallPeerInstalled = useCallback(
    (clientId: string, peer: { id: string; name?: string }) => {
      setChanges((prev) =>
        prev.map((c) =>
          c.type === "install-peer" && c.clientId === clientId
            ? { ...c, installedPeerId: peer.id, name: peer.name ?? c.name }
            : c,
        ),
      );
    },
    [],
  );

  const untrackInstallPeer = useCallback((clientId: string) => {
    setChanges((prev) =>
      prev.filter(
        (c) => !(c.type === "install-peer" && c.clientId === clientId),
      ),
    );
  }, []);

  const trackDeletePolicy = useCallback(
    ({ policyId, name }: { policyId: string; name: string }) => {
      setChanges((prev) => {
        if (policyId.startsWith("new-")) {
          return prev.filter(
            (c) => !(c.type === "create-policy" && c.clientId === policyId),
          );
        }
        // A pending update is moot once the policy is deleted, and a delete
        // already recorded by `isEmptiedPolicy` must not deploy twice.
        const filtered = prev.filter(
          (c) => !(isPendingPolicyWrite(c) && c.policyId === policyId),
        );
        return [
          ...filtered,
          { id: draftUid(), type: "delete-policy", policyId, name },
        ];
      });
    },
    [],
  );

  const removeChange = useCallback((id: string) => {
    setChanges((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearChanges = useCallback(() => {
    setChanges([]);
  }, []);

  const replaceChanges = useCallback((next: DraftChange[]) => {
    setChanges(next);
  }, []);

  const value = useMemo(
    () => ({
      changes,
      changeCount: changes.length,
      trackCreateGroup,
      trackRenameGroup,
      trackAddGroupMembers,
      trackRemoveGroupMembers,
      trackDeleteGroup,
      untrackNewGroup,
      replacePeerIdInGroups,
      trackCreateNetwork,
      updateDraftNetwork,
      untrackNetwork,
      trackUpdateNetwork,
      trackCreateResource,
      untrackResource,
      trackUpdateResource,
      trackDeleteResource,
      trackDeleteNetwork,
      addGroupToDraftResource,
      removeGroupFromDraftResource,
      trackCreateRouter,
      trackUpdateRouter,
      trackCreatePolicy,
      trackUpdatePolicy,
      patchPendingPolicyUpdate,
      trackSetPolicyEnabled,
      trackDeletePolicy,
      trackInstallPeer,
      markInstallPeerWaiting,
      clearInstallPeerKey,
      markInstallPeerInstalled,
      untrackInstallPeer,
      removeChange,
      clearChanges,
      replaceChanges,
    }),
    [
      changes,
      trackCreateGroup,
      trackRenameGroup,
      trackAddGroupMembers,
      trackRemoveGroupMembers,
      trackDeleteGroup,
      untrackNewGroup,
      replacePeerIdInGroups,
      trackCreateNetwork,
      updateDraftNetwork,
      untrackNetwork,
      trackUpdateNetwork,
      trackCreateResource,
      untrackResource,
      trackUpdateResource,
      trackDeleteResource,
      trackDeleteNetwork,
      addGroupToDraftResource,
      removeGroupFromDraftResource,
      trackCreateRouter,
      trackUpdateRouter,
      trackCreatePolicy,
      trackUpdatePolicy,
      patchPendingPolicyUpdate,
      trackSetPolicyEnabled,
      trackDeletePolicy,
      trackInstallPeer,
      markInstallPeerWaiting,
      clearInstallPeerKey,
      markInstallPeerInstalled,
      untrackInstallPeer,
      removeChange,
      clearChanges,
      replaceChanges,
    ],
  );

  return (
    <DraftChangesetContext.Provider value={value}>
      {children}
    </DraftChangesetContext.Provider>
  );
}
