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
import { Policy } from "@/interfaces/Policy";
import {
  loadDraftChanges,
  saveDraftChanges,
} from "@/modules/control-center/draft/draft-storage";

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

export type DraftChange =
  | CreateGroupChange
  | UpdateGroupChange
  | DeleteGroupChange
  | CreatePolicyChange
  | UpdatePolicyChange
  | DeletePolicyChange;

// Git-style classification for diff coloring (+ green, ~ orange, − red).
export type ChangeKind = "add" | "update" | "remove";

export const getChangeKind = (change: DraftChange): ChangeKind => {
  switch (change.type) {
    case "create-group":
    case "create-policy":
      return "add";
    case "delete-group":
    case "delete-policy":
      return "remove";
    case "update-group":
    case "update-policy":
      return "update";
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
  }
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
  trackDeleteGroup: (params: GroupRef & { name: string }) => void;
  // Removes a draft-only group's pending changes without deleting anything
  // (used when a new group is removed from the canvas).
  untrackNewGroup: (name: string) => void;
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

// Renames inside recorded policy changes: draft policies reference new groups
// by name, so a later group rename must follow into them.
const renameGroupInPolicies = (
  changes: DraftChange[],
  from: string,
  to: string,
): DraftChange[] =>
  changes.map((c) => {
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
  const [changes, setChanges] = useState<DraftChange[]>(() =>
    loadDraftChanges(),
  );

  useEffect(() => {
    saveDraftChanges(changes);
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
              existing.resourceIds.length === 0;
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

  const untrackNewGroup = useCallback((name: string) => {
    setChanges((prev) =>
      prev.filter((c) => !(c.type === "create-group" && c.name === name)),
    );
  }, []);

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
      trackDeleteGroup,
      untrackNewGroup,
      trackCreatePolicy,
      trackUpdatePolicy,
      trackSetPolicyEnabled,
      trackDeletePolicy,
      removeChange,
      clearChanges,
      replaceChanges,
    }),
    [
      changes,
      trackCreateGroup,
      trackRenameGroup,
      trackAddGroupMembers,
      trackDeleteGroup,
      untrackNewGroup,
      trackCreatePolicy,
      trackUpdatePolicy,
      trackSetPolicyEnabled,
      trackDeletePolicy,
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
