"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";

// Every draft action is recorded as a change describing the API call needed on
// deploy. Nothing hits the API until the changeset is deployed. Changes are
// coalesced per entity: renaming a group twice stays one change, renaming or
// filling a not-yet-created group folds into its create-group change, etc.

export interface CreateGroupChange {
  id: string;
  type: "create-group";
  // Canvas node id of the new group (e.g. group-new-<uuid>); the group has no
  // API id until deploy.
  clientId: string;
  name: string;
  peerIds: string[];
  resourceIds: string[];
}

// One CRUD update per existing group: carries the final name (rename) and the
// members added in the draft — deployed as a single PUT.
export interface UpdateGroupChange {
  id: string;
  type: "update-group";
  groupId: string;
  name: string;
  originalName: string;
  peerIds: string[];
  resourceIds: string[];
  // EXISTING members removed in the draft (draft-added members that are
  // removed again just leave the add lists above).
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
  // Policy data from the modal — rules reference groups as objects; new groups
  // have no id and are resolved by name on deploy.
  policy: Policy;
}

// One CRUD update per existing policy: the full policy data as it should be
// after deploy (groups as objects, new ones without ids — resolved by name).
// `origin` only affects the label: "toggle" reads Enable/Disable, "edit" reads
// Update.
export interface UpdatePolicyChange {
  id: string;
  type: "update-policy";
  policyId: string;
  name: string;
  policy: Policy;
  origin: "toggle" | "edit";
}

export interface DeletePolicyChange {
  id: string;
  type: "delete-policy";
  policyId: string;
  name: string;
}

// Networks only need a name — deployable the moment they hit the canvas.
export interface CreateNetworkChange {
  id: string;
  type: "create-network";
  // Canvas node id network-new-<uuid> → clientId "new-<uuid>".
  clientId: string;
  name: string;
  description?: string;
}

// Draft resources are recorded only once complete (name + address + network)
// — the editor saves all required fields, incomplete resources are
// canvas-only.
export interface CreateResourceChange {
  id: string;
  type: "create-resource";
  clientId: string; // "new-<uuid>"
  name: string;
  description?: string;
  address: string;
  // Parent network: API id, or clientId of a draft network (resolved on
  // deploy). networkName is display-only (labels), kept in sync on rename.
  networkId?: string;
  networkClientId?: string;
  networkName: string;
  // API group ids or draft-group names (resolved like policy groups).
  groupIds: string[];
  // Canvas enabled state — defaults to enabled when absent.
  enabled?: boolean;
}

// Routers referencing a placeholder peer stay OUT of the changeset (the
// routing edge carries the intent) until the peer installs — the upgrade
// sweep records them with the real id.
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
  // Display-only for labels.
  peerName?: string;
  groupName?: string;
  // Advanced settings from the routing-peer modal; deploy falls back to the
  // live-modal defaults (9999 / true / true) when absent.
  metric?: number;
  masquerade?: boolean;
  enabled?: boolean;
}

// Edits to an EXISTING (API) resource — enable/disable and (future) field
// edits. Keyed by the real resource id; deploy PUTs the full resource.
export interface UpdateResourceChange {
  id: string;
  type: "update-resource";
  resourceId: string;
  networkId: string;
  name: string;
  networkName: string; // display-only (labels)
  address: string;
  description?: string;
  enabled: boolean;
  groupIds: string[];
}

// Deletes an EXISTING (API) resource.
export interface DeleteResourceChange {
  id: string;
  type: "delete-resource";
  resourceId: string;
  networkId: string;
  name: string;
  networkName: string; // display-only (labels)
}

// A placeholder peer on the canvas (user device / server / agent). Not an
// API call — the peer comes into existence by INSTALLING it (or, for a user
// device, selecting an existing peer). Listed in Review & Deploy as a
// pending action so drafts that depend on it aren't silently incomplete;
// resolved (removed) by the placeholder upgrade once the real peer exists.
export interface InstallPeerChange {
  id: string;
  type: "install-peer";
  // The placeholder's draft peer id ("draft-<uuid>").
  clientId: string;
  name: string;
  kind: "user-device" | "server" | "agent";
}

export type DraftChange =
  | CreateGroupChange
  | UpdateGroupChange
  | DeleteGroupChange
  | CreatePolicyChange
  | UpdatePolicyChange
  | DeletePolicyChange
  | CreateNetworkChange
  | CreateResourceChange
  | CreateRouterChange
  | UpdateResourceChange
  | DeleteResourceChange
  | InstallPeerChange;

// Git-style classification for diff coloring (+ green, ~ orange, − red,
// install = pending action, blue).
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
    case "delete-group":
    case "delete-policy":
      return "remove";
    case "update-group":
    case "update-policy":
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
    case "create-resource":
      return `POST /networks/${change.networkId ?? "{new}"}/resources`;
    case "create-router":
      return `POST /networks/${change.networkId ?? "{new}"}/routers`;
    case "update-resource":
      return `PUT /networks/${change.networkId}/resources/${change.resourceId}`;
    case "delete-resource":
      return `DELETE /networks/${change.networkId}/resources/${change.resourceId}`;
    case "install-peer":
      // Not an API call — the peer registers itself when installed.
      return "peer install";
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
      // fall through to the create/update detail below
    }
    // eslint-disable-next-line no-fallthrough
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
    case "create-resource":
      return {
        title: `Create resource “${change.name}” in “${change.networkName}”`,
        detail: change.address,
      };
    case "create-router":
      return {
        title: change.peerId
          ? `Add routing peer “${change.peerName ?? change.peerId}” to “${change.networkName}”`
          : `Add routing peer group “${change.groupName ?? change.groupId}” to “${change.networkName}”`,
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
    case "install-peer":
      return {
        title: `Install peer “${change.name}”`,
        detail:
          change.kind === "user-device"
            ? "select an existing peer or install a new one"
            : "install to complete the draft changes that reference it",
      };
  }
};

// Non-blocking Review & Deploy warnings (the draft equivalent of the live
// "no access control policies" confirmations): unreachable resources and
// resources nothing grants access to. Warnings never block deploying.
export const getDraftWarnings = (changes: DraftChange[]): string[] => {
  const warnings: string[] = [];
  const networks = changes.filter(
    (c): c is CreateNetworkChange => c.type === "create-network",
  );
  const resources = changes.filter(
    (c): c is CreateResourceChange => c.type === "create-resource",
  );
  const routers = changes.filter(
    (c): c is CreateRouterChange => c.type === "create-router",
  );

  networks.forEach((n) => {
    const hasResources = resources.some(
      (r) => r.networkClientId === n.clientId,
    );
    const hasRouter = routers.some((r) => r.networkClientId === n.clientId);
    if (hasResources && !hasRouter) {
      warnings.push(
        `Network “${n.name}” has no routing peers, so its resources won't be reachable.`,
      );
    }
  });

  const policyChanges = changes.filter(
    (c): c is CreatePolicyChange | UpdatePolicyChange =>
      c.type === "create-policy" || c.type === "update-policy",
  );
  resources.forEach((res) => {
    const direct = policyChanges.some(
      (p) => p.policy.rules?.[0]?.destinationResource?.id === res.clientId,
    );
    const viaGroup = policyChanges.some((p) => {
      const destinations =
        (p.policy.rules?.[0]?.destinations as (Group | string)[]) ?? [];
      // res.groupIds mixes API ids and draft-group names; destinations mix
      // group objects and raw id strings — match on whichever form is there.
      return destinations.some((g) =>
        typeof g === "string"
          ? res.groupIds.includes(g)
          : res.groupIds.includes(g.name) ||
            (!!g.id && res.groupIds.includes(g.id)),
      );
    });
    if (!direct && !viaGroup) {
      warnings.push(
        `Resource “${res.name}” is not referenced by any policy, so no peer will have access.`,
      );
    }
  });

  return warnings;
};

// Canvas-only states that silently withhold changes from deploy — surfaced in
// Review & Deploy so the user learns WHY something they built isn't listed:
// policies referencing uninstalled placeholder peers (hard requirement — the
// peer must exist before the policy can) and draft resources that never became
// complete (no network assigned), which never reached the changeset.
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
      if (!hasBothSides) return; // incomplete policies are visibly unfinished
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

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Groups are referenced by API id when they exist, otherwise by name: a group
// that only lives in the draft has no id, and group names are unique, so the
// (always current) name on its create-group change is the stable key.
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
    },
  ) => void;
  trackDeleteGroup: (params: GroupRef & { name: string }) => void;
  // Removes a draft-only group's pending changes without deleting anything
  // (used when a new group is removed from the canvas).
  untrackNewGroup: (name: string) => void;
  // Renames a member peer id inside every create/update-group change and
  // every router change — used when a placeholder ("draft-…") upgrades to a
  // real peer.
  replacePeerIdInGroups: (oldId: string, newId: string, newName?: string) => void;
  // Networks / resources / routers (draft-created; edits fold into creates).
  trackCreateNetwork: (params: {
    clientId: string;
    name: string;
    description?: string;
  }) => void;
  // Rename/description edits fold into the create change and follow into
  // dependent resource/router labels.
  updateDraftNetwork: (params: {
    clientId: string;
    name: string;
    description?: string;
  }) => void;
  // Drops the network and cascades: dependent resources lose their network
  // (change dropped — they're incomplete now), dependent routers dropped.
  untrackNetwork: (clientId: string) => void;
  // Upserts by clientId — the editor always saves the full resource.
  trackCreateResource: (params: Omit<CreateResourceChange, "id" | "type">) => void;
  // Drops the resource change and removes its id from group memberships.
  untrackResource: (clientId: string) => void;
  // Edits to an EXISTING resource (enable/disable, field edits) — one change
  // per resource id.
  trackUpdateResource: (
    params: Omit<UpdateResourceChange, "id" | "type">,
  ) => void;
  // Deletes an EXISTING resource (supersedes a pending update).
  trackDeleteResource: (
    params: Omit<DeleteResourceChange, "id" | "type">,
  ) => void;
  // Adds a group ref (API id or draft-group name) to a draft resource's
  // create change — deploy applies groups via the resource's own `groups`
  // field (group changes deploy before resources exist).
  addGroupToDraftResource: (clientId: string, groupRef: string) => void;
  // Inverse of addGroupToDraftResource.
  removeGroupFromDraftResource: (clientId: string, groupRef: string) => void;
  trackCreateRouter: (params: Omit<CreateRouterChange, "id" | "type">) => void;
  // Drops a router change by its network + peer/group reference.
  untrackRouter: (params: {
    networkRef: string; // networkId or networkClientId
    peerId?: string;
    groupId?: string;
  }) => void;
  trackCreatePolicy: (params: { clientId: string; policy: Policy }) => void;
  // Edits from the policy modal — updates the pending create change for draft
  // policies ("new-…" ids), records/replaces an update-policy change otherwise.
  trackUpdatePolicy: (params: { policyId: string; policy: Policy }) => void;
  // Enable/disable — folded into a pending create/update change when one
  // exists, otherwise recorded as a toggle-flavored update-policy change.
  trackSetPolicyEnabled: (params: {
    policyId: string;
    name: string;
    enabled: boolean;
    originalEnabled: boolean;
    policy: Policy;
  }) => void;
  trackDeletePolicy: (params: { policyId: string; name: string }) => void;
  // Placeholder peers: pending installs listed in Review & Deploy. Upserted
  // by clientId (renames update the entry), resolved on placeholder upgrade
  // or canvas removal.
  trackInstallPeer: (params: {
    clientId: string;
    name: string;
    kind: InstallPeerChange["kind"];
  }) => void;
  untrackInstallPeer: (clientId: string) => void;
  removeChange: (id: string) => void;
  clearChanges: () => void;
  // Wholesale restore — used by draft undo/redo history.
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

// Renames inside recorded changes: draft groups are referenced by name in
// policies (sources/destinations), resources (groupIds), and routers
// (groupId), so a later group rename must follow into them.
const renameGroupInPolicies = (
  changes: DraftChange[],
  from: string,
  to: string,
): DraftChange[] =>
  changes.map((c) => {
    if (c.type === "create-resource" && c.groupIds.includes(from)) {
      return {
        ...c,
        groupIds: c.groupIds.map((id) => (id === from ? to : id)),
      };
    }
    if (c.type === "create-router" && c.groupId === from) {
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
  // Draft changes live only in React state — they exist for the lifetime of
  // the draft session and are gone on reload (no persistence).
  const [changes, setChanges] = useState<DraftChange[]>([]);

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
        { id: uid(), type: "create-group", clientId, name, peerIds, resourceIds },
      ]);
    },
    [],
  );

  const trackRenameGroup = useCallback(
    ({ groupId, from, to }: GroupRef & { from: string; to: string }) => {
      setChanges((prev) => {
        let next: DraftChange[];
        if (!groupId) {
          // New group — just update its pending create change.
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
            // Back to the original name with nothing else pending — the
            // update is a no-op and the change disappears.
            next = reverted
              ? prev.filter((c) => c.id !== existing.id)
              : prev.map((c) =>
                  c.id === existing.id ? { ...existing, name: to } : c,
                );
          } else {
            next = [
              ...prev,
              {
                id: uid(),
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
          // New group — members land directly in its create change.
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
          return prev.map((c) =>
            c.id === existing.id
              ? {
                  ...existing,
                  peerIds: [...new Set([...existing.peerIds, ...peerIds])],
                  resourceIds: [
                    ...new Set([...existing.resourceIds, ...resourceIds]),
                  ],
                  // Re-adding a member that was removed in the draft reverts
                  // the removal.
                  removedPeerIds: existing.removedPeerIds?.filter(
                    (id) => !peerIds.includes(id),
                  ),
                  removedResourceIds: existing.removedResourceIds?.filter(
                    (id) => !resourceIds.includes(id),
                  ),
                }
              : c,
          );
        }
        return [
          ...prev,
          {
            id: uid(),
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

  // Inverse of trackAddGroupMembers. Draft-added members simply leave the
  // add lists; EXISTING members land in the removed lists (deploy drops them
  // from the group's membership). A fully reverted update change disappears.
  const trackRemoveGroupMembers = useCallback(
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
          // New group — members only exist in its create change.
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
          // Ids sitting in the add lists were draft-added — removing them is
          // a pure revert. The rest are existing members → removed lists.
          const next: UpdateGroupChange = {
            ...c,
            peerIds: c.peerIds.filter((id) => !peerIds.includes(id)),
            resourceIds: c.resourceIds.filter(
              (id) => !resourceIds.includes(id),
            ),
            removedPeerIds: [
              ...new Set([
                ...(c.removedPeerIds ?? []),
                ...peerIds.filter((id) => !c.peerIds.includes(id)),
              ]),
            ],
            removedResourceIds: [
              ...new Set([
                ...(c.removedResourceIds ?? []),
                ...resourceIds.filter((id) => !c.resourceIds.includes(id)),
              ]),
            ],
          };
          return next;
        };
        if (existing) {
          const updated = applyTo(existing);
          const noop =
            updated.name === updated.originalName &&
            updated.peerIds.length === 0 &&
            updated.resourceIds.length === 0 &&
            (updated.removedPeerIds?.length ?? 0) === 0 &&
            (updated.removedResourceIds?.length ?? 0) === 0;
          return noop
            ? prev.filter((c) => c.id !== existing.id)
            : prev.map((c) => (c.id === existing.id ? updated : c));
        }
        return [
          ...prev,
          applyTo({
            id: uid(),
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

  const untrackNewGroup = useCallback((name: string) => {
    setChanges((prev) =>
      prev.filter((c) => !(c.type === "create-group" && c.name === name)),
    );
  }, []);

  const replacePeerIdInGroups = useCallback(
    (oldId: string, newId: string, newName?: string) => {
      setChanges((prev) =>
        prev.map((c) => {
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
        }),
      );
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
        { id: uid(), type: "create-network", clientId, name, description },
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

  const untrackNetwork = useCallback((clientId: string) => {
    setChanges((prev) =>
      prev.filter((c) => {
        if (c.type === "create-network" && c.clientId === clientId)
          return false;
        // A resource without its network is incomplete → out of the
        // changeset; routers without their network are meaningless.
        if (
          (c.type === "create-resource" || c.type === "create-router") &&
          c.networkClientId === clientId
        )
          return false;
        return true;
      }),
    );
  }, []);

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
        return [...prev, { id: uid(), type: "create-resource", ...params }];
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

  // Edits to an existing resource (enable/disable, field edits) — one
  // update-resource per resource id. Reverting `enabled` back to its original
  // with nothing else changed drops the change.
  const trackUpdateResource = useCallback(
    (params: Omit<UpdateResourceChange, "id" | "type">) => {
      setChanges((prev) => {
        const existing = prev.find(
          (c): c is UpdateResourceChange =>
            c.type === "update-resource" &&
            c.resourceId === params.resourceId,
        );
        if (existing) {
          return prev.map((c) =>
            c.id === existing.id ? { ...existing, ...params } : c,
          );
        }
        return [...prev, { id: uid(), type: "update-resource", ...params }];
      });
    },
    [],
  );

  // Deletes an existing resource — supersedes any pending update-resource.
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
        { id: uid(), type: "delete-resource", ...params },
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
        return [...prev, { id: uid(), type: "create-router", ...params }];
      });
    },
    [],
  );

  const untrackRouter = useCallback(
    ({
      networkRef,
      peerId,
      groupId,
    }: {
      networkRef: string;
      peerId?: string;
      groupId?: string;
    }) => {
      setChanges((prev) =>
        prev.filter(
          (c) =>
            !(
              c.type === "create-router" &&
              (c.networkId === networkRef ||
                c.networkClientId === networkRef) &&
              c.peerId === peerId &&
              c.groupId === groupId
            ),
        ),
      );
    },
    [],
  );

  const trackDeleteGroup = useCallback(
    ({ groupId, name }: GroupRef & { name: string }) => {
      setChanges((prev) => {
        if (!groupId) {
          // Deleting a group that was never created = dropping its changes.
          return prev.filter(
            (c) => !(c.type === "create-group" && c.name === name),
          );
        }
        // A pending update is moot once the group is deleted.
        const filtered = prev.filter(
          (c) => !(c.type === "update-group" && c.groupId === groupId),
        );
        return [
          ...filtered,
          { id: uid(), type: "delete-group", groupId, name },
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
          id: uid(),
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
    ({ policyId, policy }: { policyId: string; policy: Policy }) => {
      setChanges((prev) => {
        // Draft-created policy — the create change carries the latest data.
        if (policyId.startsWith("new-")) {
          return prev.map((c) =>
            c.type === "create-policy" && c.clientId === policyId
              ? { ...c, name: policy.name ?? c.name, policy }
              : c,
          );
        }
        // The full update supersedes earlier updates/toggles for this policy.
        const filtered = prev.filter(
          (c) => !(c.type === "update-policy" && c.policyId === policyId),
        );
        return [
          ...filtered,
          {
            id: uid(),
            type: "update-policy",
            policyId,
            name: policy.name ?? "Policy",
            policy,
            origin: "edit",
          },
        ];
      });
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
        // Draft-created policy — flip the flag inside its create change.
        if (policyId.startsWith("new-")) {
          return prev.map((c) =>
            c.type === "create-policy" && c.clientId === policyId
              ? { ...c, policy: setEnabled(c.policy) }
              : c,
          );
        }
        const update = prev.find(
          (c): c is UpdatePolicyChange =>
            c.type === "update-policy" && c.policyId === policyId,
        );
        if (update) {
          // A toggle-only change flipped back to the live state disappears;
          // a pending edit just carries the new flag.
          if (update.origin === "toggle" && enabled === originalEnabled) {
            return prev.filter((c) => c.id !== update.id);
          }
          return prev.map((c) =>
            c.id === update.id
              ? { ...update, policy: setEnabled(update.policy) }
              : c,
          );
        }
        if (enabled === originalEnabled) return prev;
        return [
          ...prev,
          {
            id: uid(),
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
          { id: uid(), type: "install-peer", clientId, name, kind },
        ];
      });
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
        // A pending update is moot once the policy is deleted.
        const filtered = prev.filter(
          (c) => !(c.type === "update-policy" && c.policyId === policyId),
        );
        return [
          ...filtered,
          { id: uid(), type: "delete-policy", policyId, name },
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
      trackCreateResource,
      untrackResource,
      trackUpdateResource,
      trackDeleteResource,
      addGroupToDraftResource,
      removeGroupFromDraftResource,
      trackCreateRouter,
      untrackRouter,
      trackCreatePolicy,
      trackUpdatePolicy,
      trackSetPolicyEnabled,
      trackDeletePolicy,
      trackInstallPeer,
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
      trackCreateResource,
      untrackResource,
      trackUpdateResource,
      trackDeleteResource,
      addGroupToDraftResource,
      removeGroupFromDraftResource,
      trackCreateRouter,
      untrackRouter,
      trackCreatePolicy,
      trackUpdatePolicy,
      trackSetPolicyEnabled,
      trackDeletePolicy,
      trackInstallPeer,
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
