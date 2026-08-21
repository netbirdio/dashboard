import { useCallback, useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import { useApiCall } from "@utils/api";
import { normalizeHostCIDR } from "@utils/ip";
import { notify } from "@components/Notification";
import { Group } from "@/interfaces/Group";
import {
  Network,
  NetworkResource,
  NetworkRouter,
} from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import {
  CHANGE_DEPLOY_ORDER,
  DraftChange,
  getChangeLabel,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
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

// Executes the draft changeset in CHANGE_DEPLOY_ORDER, stopping on the first failure.
export type DeployStatus = "deploying" | "done" | "error";

// Identifies a change BY CONTENT: ids stay stable across an edit.
const changeSignature = (change: DraftChange) => JSON.stringify(change);

export function useDeployChangeset() {
  const { changes } = useDraftChangeset();
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
  useEffect(() => {
    if (changes.length === 0 && doneSignatures.current.size > 0) {
      doneSignatures.current.clear();
      setDeployStatus({});
    }
  }, [changes.length]);

  const deploy = useCallback(async (): Promise<boolean> => {
    setIsDeploying(true);

    // Group name → id, updated as groups get created during the deploy.
    const nameToId = new Map<string, string>();
    groups?.forEach((g) => g.id && nameToId.set(g.name, g.id));

    const networkClientMap = networkClientToId.current;
    const resourceClientMap = resourceClientToId.current;
    const resolveNetworkId = (change: {
      networkId?: string;
      networkClientId?: string;
      networkName: string;
    }) => {
      const id =
        change.networkId ??
        (change.networkClientId
          ? networkClientMap.get(change.networkClientId)
          : undefined) ??
        // Retry fallback: a network created in an earlier run is gone from the map.
        networks?.find((n) => n.name === change.networkName)?.id;
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
        const id = g.id ?? nameToId.get(g.name);
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
      groupIdForRef: (ref) => nameToId.get(ref) ?? ref,
      normalizeAddress: normalizeHostCIDR,
      // The group POST/PUT sends resources as {id, type} objects.
      resourceType: (id) =>
        resourceClientMap.get(id)?.type ??
        networkResources?.find((res) => res.id === id)?.type,
    };

    const executeChange = async (change: DraftChange) => {
      switch (change.type) {
        case "create-group": {
          const created = await groupRequest.post(
            groupCreateBody(change, resolvers),
          );
          if (created?.id) nameToId.set(created.name, created.id);
          return;
        }
        case "update-group": {
          // Merge against the CURRENT state: a stale SWR snapshot would drop members.
          const base =
            (await groupRequest
              .get(`/${change.groupId}`)
              .catch(() => undefined)) ??
            groups?.find((g) => g.id === change.groupId);
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
          const created = await networkRequest.post(networkCreateBody(change));
          if (created?.id) networkClientMap.set(change.clientId, created.id);
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
          const networkId = resolveNetworkId(change);
          const created = await resourceRequest.post(
            resourceCreateBody(change, resolvers),
            `/${networkId}/resources`,
          );
          if (created?.id) {
            resourceClientMap.set(change.clientId, {
              id: created.id,
              type: created.type,
            });
          }
          return;
        }
        case "create-router": {
          const networkId = resolveNetworkId(change);
          await routerRequest.post(
            routerCreateBody(change, resolvers),
            `/${networkId}/routers`,
          );
          return;
        }
        case "update-router": {
          await routerRequest.put(
            routerUpdateBody(change, resolvers),
            `/${change.networkId}/routers/${change.routerId}`,
          );
          return;
        }
        case "create-policy": {
          await policyRequest.post(policyRequestBody(change.policy, resolvers));
          return;
        }
        case "update-policy": {
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

    const run = async () => {
      for (const change of ordered) {
        // Coalescing keeps a change's id across edits, so compare the payload too.
        const deployed = doneSignatures.current.get(change.id);
        if (
          deployed !== undefined &&
          (change.type.startsWith("create-") ||
            deployed === changeSignature(change))
        ) {
          continue;
        }
        setDeployStatus((p) => ({ ...p, [change.id]: "deploying" }));
        try {
          await executeChange(change);
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
        title: "Deploy",
        description: "Changes deployed successfully.",
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
    }
  }, [
    changes,
    groups,
    networks,
    networkResources,
    groupRequest,
    policyRequest,
    networkRequest,
    resourceRequest,
    routerRequest,
  ]);

  return { deploy, isDeploying, deployStatus };
}
