import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { normalizeHostCIDR } from "@utils/ip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mutate } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import {
  Network,
  NetworkResource,
  NetworkRouter,
} from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import {
  CHANGE_DEPLOY_ORDER,
  CHANGE_PERMISSION,
  DraftChange,
  getChangeApiCall,
  getChangeLabel,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import {
  deletedGroupRefs,
  pendingGroupDeletions,
} from "@/modules/control-center/utils/change-cascade";
import {
  groupCreateBody,
  groupUpdateBody,
  mergeGroupMembers,
  networkCreateBody,
  networkUpdateBody,
  policyRequestBody,
  RequestResolvers,
  resourceCreateBody,
  resourceUpdateBody,
  routerCreateBody,
  routerUpdateBody,
} from "@/modules/control-center/utils/changeset-request";
import { isDeployablePolicy } from "@/modules/control-center/utils/helpers";

// Executes the draft changeset in CHANGE_DEPLOY_ORDER, stopping on the first failure.
export type DeployStatus = "deploying" | "done" | "error";

// Read by DraftHistoryContext: undo/redo must be inert while a run is in flight, or
// a retry re-sends payloads the user never re-approved. Module-level: no shared parent.
export const deployInFlight = { current: false };

// Identifies a change BY CONTENT: ids stay stable across an edit.
const changeSignature = (change: DraftChange) => JSON.stringify(change);

// The signature IS the serialized change, so it doubles as a record of what the
// earlier run actually sent.
const parseSignature = <T extends DraftChange>(sig?: string): T | undefined => {
  if (!sig) return undefined;
  try {
    return JSON.parse(sig) as T;
  } catch {
    return undefined;
  }
};

export function useDeployChangeset() {
  const { changes } = useDraftChangeset();
  const { permission } = usePermissions();
  const { groups, networks, networkResources } = useControlCenterData();
  // Draft client ids → real API ids, persisted across deploy() calls so retries resolve them.
  const networkClientToId = useRef(new Map<string, string>());
  const resourceClientToId = useRef(
    new Map<string, { id: string; type?: NetworkResource["type"] }>(),
  );
  const groupRequest = useApiCall<Group>("/groups", true);
  const policyRequest = useApiCall<Policy>("/policies", true);
  const networkRequest = useApiCall<Network>("/networks", true);
  const resourceRequest = useApiCall<NetworkResource>("/networks", true);
  const routerRequest = useApiCall<NetworkRouter>("/networks", true);
  const [isDeploying, setIsDeploying] = useState(false);
  // Succeeded changes are NOT removed; they stay visible with a check.
  const [deployStatus, setDeployStatus] = useState<
    Record<string, DeployStatus>
  >({});
  // change id → the payload deployed under it, so a retry can spot an edit.
  const doneSignatures = useRef(new Map<string, string>());
  // change id → what its create returned, so an edit retries as a PUT.
  const createdIds = useRef(
    new Map<string, { id: string; networkId?: string }>(),
  );
  useEffect(() => {
    if (changes.length === 0 && doneSignatures.current.size > 0) {
      doneSignatures.current.clear();
      createdIds.current.clear();
      setDeployStatus({});
    }
  }, [changes.length]);

  const deploy = useCallback(async (): Promise<boolean> => {
    setIsDeploying(true);
    deployInFlight.current = true;

    // Group name → id, updated as groups get created. Names aren't unique account-wide,
    // so a name carried by more than one group is recorded as ambiguous.
    const nameToId = new Map<string, string>();
    const ambiguousNames = new Set<string>();
    groups?.forEach((g) => {
      if (!g.id) return;
      if (nameToId.has(g.name)) ambiguousNames.add(g.name);
      else nameToId.set(g.name, g.id);
    });
    const liveGroupIds = new Set(
      (groups ?? []).map((g) => g.id).filter(Boolean) as string[],
    );

    const groupIdForName = (name: string) => {
      if (ambiguousNames.has(name)) {
        throw new Error(
          `More than one group is named "${name}". Rename one so the change can be matched to it.`,
        );
      }
      return nameToId.get(name);
    };

    const networkClientMap = networkClientToId.current;
    const resourceClientMap = resourceClientToId.current;
    const resolveNetworkId = (change: {
      networkId?: string;
      networkClientId?: string;
      networkName: string;
    }) => {
      const mapped =
        change.networkId ??
        (change.networkClientId
          ? networkClientMap.get(change.networkClientId)
          : undefined);
      if (mapped) return mapped;
      // Retry fallback: a network created in an earlier run is gone from the map.
      // Names aren't unique, so an ambiguous match must not pick one at random.
      const byName = (networks ?? []).filter(
        (n) => n.name === change.networkName,
      );
      if (byName.length > 1) {
        throw new Error(
          `More than one network is named "${change.networkName}". Rename one so the change can be matched to it.`,
        );
      }
      const id = byName[0]?.id;
      if (!id) {
        throw new Error(
          `Network "${change.networkName}" is missing. It may have been removed from the draft.`,
        );
      }
      return id;
    };

    const resolveGroupIds = (list?: (Group | string)[] | null) => {
      if (!list) return undefined;
      return list.map((g) => {
        if (typeof g === "string") return g;
        const id = g.id ?? groupIdForName(g.name);
        if (!id) {
          throw new Error(
            `Group "${g.name}" is missing. It may have been removed from the draft.`,
          );
        }
        return id;
      });
    };

    // Draft resources deploy before policies, so their "new-…" ids resolve here.
    const resolveResource = (
      r?: PolicyRuleResource,
    ): PolicyRuleResource | undefined => {
      if (!r) return undefined;
      if (!r.id.startsWith("new-")) return r;
      const created = resourceClientMap.get(r.id);
      if (!created) {
        throw new Error(
          "A referenced resource is missing. It may have been removed from the draft.",
        );
      }
      return { id: created.id, type: created.type ?? r.type };
    };

    const resolvers: RequestResolvers = {
      resolveGroupIds,
      resolveResource,
      resolveNetworkId,
      // The id is the unambiguous half of the name-or-id union, so it is tried FIRST.
      // previewResolvers resolves in the same order: the code view is what the user approves.
      groupIdForRef: (ref) => {
        if (liveGroupIds.has(ref)) return ref;
        const id = groupIdForName(ref);
        if (id) return id;
        throw new Error(
          `Group "${ref}" is missing. It may have been removed from the draft.`,
        );
      },
      normalizeAddress: normalizeHostCIDR,
      // The group POST/PUT sends resources as {id, type} objects.
      resourceType: (id) =>
        resourceClientMap.get(id)?.type ??
        networkResources?.find((res) => res.id === id)?.type,
    };

    // Draft resources in THIS changeset resolve to real ids before policies deploy.
    const trackedResourceClientIds = new Set(
      changes.flatMap((c) => (c.type === "create-resource" ? [c.clientId] : [])),
    );

    // The upstream gate in ReviewDeployModal is keyed on a DIFFERENT entity, so
    // the sink checks the policy itself rather than trusting the two to agree.
    const assertDeployable = (policy: Policy) => {
      if (isDeployablePolicy(policy, trackedResourceClientIds)) return;
      throw new Error(
        "It still references a peer or resource that does not exist yet, or is missing a source or destination.",
      );
    };

    // Resources and routers deploy BEFORE delete-group, and a landed reference fails
    // the DELETE on every retry — the sink refuses it, not just the UI.
    const doomedGroups = pendingGroupDeletions(changes);
    const assertNoDoomedGroups = (change: DraftChange) => {
      const refs = deletedGroupRefs(change, doomedGroups);
      if (refs.length === 0) return;
      const names = refs.map((id) => `"${doomedGroups.get(id)}"`).join(", ");
      throw new Error(
        `It references ${
          refs.length === 1 ? "group" : "groups"
        } ${names}, which this deploy also deletes. Take the group off this change, or discard the deletion.`,
      );
    };

    const deployedPayload = <T extends DraftChange>(change: T) =>
      parseSignature<T>(doneSignatures.current.get(change.id));

    // Create and update bodies share a shape.
    const executeChange = async (
      change: DraftChange,
      created?: { id: string; networkId?: string },
    ) => {
      const createdId = created?.id;
      // A resource or router lives under the network its POST ran against; if the
      // change has since moved, the retry refuses rather than PUT a wrong path.
      const createdUnder = (networkId: string) => {
        if (!created) return undefined;
        if (created.networkId !== networkId) {
          throw new Error(
            "It was already created in another network. Remove this change and add it to the new network instead.",
          );
        }
        return created.id;
      };
      switch (change.type) {
        case "create-group": {
          // The retry merges onto a fresh read like update-group below;
          // removals are derived by diffing against what this run sent.
          let saved: Group | undefined;
          if (createdId) {
            const base = await groupRequest.get(`/${createdId}`);
            if (!base) throw new Error("Group no longer exists.");
            const sent = deployedPayload(change);
            saved = await groupRequest.put(
              groupUpdateBody(
                change.name,
                mergeGroupMembers(
                  base,
                  {
                    peerIds: change.peerIds,
                    resourceIds: change.resourceIds,
                    removedPeerIds: sent?.peerIds.filter(
                      (id) => !change.peerIds.includes(id),
                    ),
                    removedResourceIds: sent?.resourceIds.filter(
                      (id) => !change.resourceIds.includes(id),
                    ),
                  },
                  resolvers,
                ),
              ),
              `/${createdId}`,
            );
          } else {
            saved = await groupRequest.post(groupCreateBody(change, resolvers));
          }
          if (saved?.id) {
            nameToId.set(saved.name, saved.id);
            liveGroupIds.add(saved.id);
            // A by-name ref after this create means the group it just made, so
            // the name is no longer ambiguous for the rest of the run.
            ambiguousNames.delete(saved.name);
            createdIds.current.set(change.id, { id: saved.id });
          }
          return;
        }
        case "update-group": {
          // The PUT sends the FULL member list, so it merges onto a FRESH read:
          // the SWR snapshot would erase members another admin added since.
          const base = await groupRequest.get(`/${change.groupId}`);
          if (!base) throw new Error("Group no longer exists.");
          const updated = await groupRequest.put(
            groupUpdateBody(
              change.name,
              mergeGroupMembers(base, change, resolvers),
            ),
            `/${change.groupId}`,
          );
          if (updated?.id) nameToId.set(updated.name, updated.id);
          return;
        }
        case "create-network": {
          const body = networkCreateBody(change);
          const saved = createdId
            ? await networkRequest.put(body, `/${createdId}`)
            : await networkRequest.post(body);
          if (saved?.id) {
            networkClientMap.set(change.clientId, saved.id);
            createdIds.current.set(change.id, { id: saved.id });
          }
          return;
        }
        case "update-network": {
          await networkRequest.put(
            networkUpdateBody(change),
            `/${change.networkId}`,
          );
          return;
        }
        case "create-resource": {
          assertNoDoomedGroups(change);
          const networkId = resolveNetworkId(change);
          const body = resourceCreateBody(change, resolvers);
          const existing = createdUnder(networkId);
          const saved = existing
            ? await resourceRequest.put(
                body,
                `/${networkId}/resources/${existing}`,
              )
            : await resourceRequest.post(body, `/${networkId}/resources`);
          if (saved?.id) {
            resourceClientMap.set(change.clientId, {
              id: saved.id,
              type: saved.type,
            });
            createdIds.current.set(change.id, { id: saved.id, networkId });
          }
          return;
        }
        case "create-router": {
          assertNoDoomedGroups(change);
          const networkId = resolveNetworkId(change);
          const body = routerCreateBody(change, resolvers);
          const existing = createdUnder(networkId);
          const saved = existing
            ? await routerRequest.put(body, `/${networkId}/routers/${existing}`)
            : await routerRequest.post(body, `/${networkId}/routers`);
          if (saved?.id) {
            createdIds.current.set(change.id, { id: saved.id, networkId });
          }
          return;
        }
        case "update-router": {
          assertNoDoomedGroups(change);
          await routerRequest.put(
            routerUpdateBody(change, resolvers),
            `/${change.networkId}/routers/${change.routerId}`,
          );
          return;
        }
        case "create-policy": {
          assertDeployable(change.policy);
          const body = policyRequestBody(change.policy, resolvers);
          const saved = createdId
            ? await policyRequest.put(body, `/${createdId}`)
            : await policyRequest.post(body);
          if (saved?.id) createdIds.current.set(change.id, { id: saved.id });
          return;
        }
        case "update-policy": {
          assertDeployable(change.policy);
          await policyRequest.put(
            policyRequestBody(change.policy, resolvers),
            `/${change.policyId}`,
          );
          return;
        }
        case "delete-policy": {
          await policyRequest.del("", `/${change.policyId}`);
          return;
        }
        case "delete-group": {
          await groupRequest.del("", `/${change.groupId}`);
          return;
        }
        case "update-resource": {
          assertNoDoomedGroups(change);
          await resourceRequest.put(
            resourceUpdateBody(change, resolvers),
            `/${change.networkId}/resources/${change.resourceId}`,
          );
          return;
        }
        case "delete-resource": {
          await resourceRequest.del(
            "",
            `/${change.networkId}/resources/${change.resourceId}`,
          );
          return;
        }
        case "delete-network": {
          await networkRequest.del("", `/${change.networkId}`);
          return;
        }
      }
    };

    // install-peer entries aren't API calls; the user performs them by hand.
    const ordered = changes
      .filter((c) => c.type !== "install-peer")
      .sort(
        (a, b) =>
          CHANGE_DEPLOY_ORDER.indexOf(a.type) -
          CHANGE_DEPLOY_ORDER.indexOf(b.type),
      );

    // Refused BEFORE the first request: a mid-run 403 leaves the account half-changed
    // and every retry fails at the same place.
    const forbidden = ordered.filter((c) => {
      const needed =
        CHANGE_PERMISSION[c.type as keyof typeof CHANGE_PERMISSION];
      return needed && !permission[needed.module][needed.action];
    });
    if (forbidden.length > 0) {
      setIsDeploying(false);
      deployInFlight.current = false;
      notify({
        title: "Deploy failed",
        description: `You don't have permission to ${forbidden
          .map((c) => getChangeApiCall(c))
          .join(", ")}. Remove ${
          forbidden.length === 1 ? "that change" : "those changes"
        } and try again.`,
        backgroundColor: "bg-red-500",
      });
      return false;
    }

    // A policy carrying both would be written and then destroyed. The trackers
    // keep them exclusive; this refuses to guess if a future path breaks that.
    const contradicted = ordered.find(
      (c) =>
        c.type === "delete-policy" &&
        ordered.some(
          (o) => o.type === "update-policy" && o.policyId === c.policyId,
        ),
    );
    if (contradicted) {
      setIsDeploying(false);
      deployInFlight.current = false;
      notify({
        title: "Deploy failed",
        description: `Policy “${
          (contradicted as { name?: string }).name ?? "Policy"
        }” is marked both for update and for deletion. Remove one of the two changes and try again.`,
        backgroundColor: "bg-red-500",
      });
      return false;
    }

    const run = async () => {
      for (const change of ordered) {
        // Coalescing keeps a change's id across edits, so compare the payload too.
        const deployed = doneSignatures.current.get(change.id);
        if (deployed !== undefined && deployed === changeSignature(change)) {
          continue;
        }
        setDeployStatus((p) => ({ ...p, [change.id]: "deploying" }));
        try {
          await executeChange(change, createdIds.current.get(change.id));
        } catch (err) {
          setDeployStatus((p) => ({ ...p, [change.id]: "error" }));
          const label = getChangeLabel(change).title;
          const e = err as { message?: string; code?: number };
          // Failed + remaining changes stay in the draft for a retry.
          throw {
            message: `${label}: ${e?.message ?? "The API request failed."}`,
            code: e?.code ?? 0,
          };
        }
        doneSignatures.current.set(change.id, changeSignature(change));
        setDeployStatus((p) => ({ ...p, [change.id]: "done" }));
      }
    };

    // Progress shows per-change in the modal, so only a failure raises a toast.
    try {
      await run();
      return true;
    } catch (err) {
      // The no-op catch avoids an unhandled rejection before notify attaches its handler.
      const rejected = Promise.reject(err);
      void rejected.catch(() => {});
      notify({
        title: "Deploy failed",
        // Only reached on rejection, where the toast renders the error instead.
        description: "The deploy stopped on a failed change.",
        promise: rejected,
      });
      return false;
    } finally {
      // Await revalidation so the live view rebuilds from fresh data on exit.
      await Promise.all([
        mutate("/groups"),
        mutate("/policies"),
        mutate("/networks"),
        mutate("/networks/resources"),
      ]).catch(() => {});
      setIsDeploying(false);
      deployInFlight.current = false;
    }
  }, [
    changes,
    permission,
    groups,
    networks,
    networkResources,
    groupRequest,
    policyRequest,
    networkRequest,
    resourceRequest,
    routerRequest,
  ]);

  // "done" holds only while the payload matches what the run sent; an edited
  // change gets its row menu back and re-sends on retry.
  const effectiveStatus = useMemo(() => {
    let out: Record<string, DeployStatus> | null = null;
    for (const change of changes) {
      if (
        deployStatus[change.id] === "done" &&
        doneSignatures.current.get(change.id) !== changeSignature(change)
      ) {
        out = out ?? { ...deployStatus };
        delete out[change.id];
      }
    }
    return out ?? deployStatus;
  }, [changes, deployStatus]);

  return { deploy, isDeploying, deployStatus: effectiveStatus };
}
