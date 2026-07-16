import { useCallback, useState } from "react";
import { mutate } from "swr";
import { useApiCall } from "@utils/api";
import { normalizeHostCIDR } from "@utils/ip";
import { notify } from "@components/Notification";
import { Group, GroupPeer, GroupResource } from "@/interfaces/Group";
import {
  Network,
  NetworkResource,
  NetworkRouter,
} from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import {
  DraftChange,
  getChangeLabel,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

const toIds = (items?: (GroupPeer | GroupResource | string)[] | null) =>
  (items ?? [])
    .map((i) => (typeof i === "string" ? i : i.id))
    .filter(Boolean) as string[];

// Executes the draft changeset against the API in CRUD dependency order:
// groups are created first (so policies can resolve them by name), then group
// updates, policy creates/updates/deletes, and group deletes last (a group can
// only be deleted once nothing references it). Stops on the first failure —
// completed changes are removed from the set, so a retry resumes cleanly.
export function useDeployChangeset() {
  const { changes, removeChange } = useDraftChangeset();
  const { groups } = useControlCenterData();
  const groupRequest = useApiCall<Group>("/groups", true);
  const policyRequest = useApiCall<Policy>("/policies", true);
  const networkRequest = useApiCall<Network>("/networks", true);
  const resourceRequest = useApiCall<NetworkResource>("/networks", true);
  const routerRequest = useApiCall<NetworkRouter>("/networks", true);
  const [isDeploying, setIsDeploying] = useState(false);

  const deploy = useCallback(async (): Promise<boolean> => {
    setIsDeploying(true);

    // Group name → id, updated as groups get created during the deploy.
    const nameToId = new Map<string, string>();
    groups?.forEach((g) => g.id && nameToId.set(g.name, g.id));

    // Draft network / resource client ids → API ids, filled as the creates
    // respond; consumed by dependent resources/routers/policies.
    const networkClientToId = new Map<string, string>();
    const resourceClientToId = new Map<
      string,
      { id: string; type?: NetworkResource["type"] }
    >();
    const resolveNetworkId = (change: {
      networkId?: string;
      networkClientId?: string;
      networkName: string;
    }) => {
      const id =
        change.networkId ??
        (change.networkClientId
          ? networkClientToId.get(change.networkClientId)
          : undefined);
      if (!id) {
        throw new Error(
          `Network "${change.networkName}" is missing — it may have been removed from the draft.`,
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
            `Group "${g.name}" is missing — it may have been removed from the draft.`,
          );
        }
        return id;
      });
    };

    // Request body for POST/PUT /policies from draft policy data: group
    // objects become ids, posture checks become ids, SSH specifics applied.
    const buildPolicyBody = (policy: Policy) => {
      const rule = policy.rules?.[0];
      if (!rule) throw new Error("Policy has no rule.");

      const isSsh = rule.protocol === "netbird-ssh";
      const authorizedGroups: Record<string, string[]> = {};
      if (isSsh && rule.authorized_groups) {
        Object.entries(rule.authorized_groups).forEach(
          ([nameOrId, usernames]) => {
            const id = nameToId.get(nameOrId) ?? nameOrId;
            authorizedGroups[id] = usernames as string[];
          },
        );
      }

      // Draft resources deploy before policies — resolve their "new-…" ids
      // (and take the authoritative type from the created resource).
      const resolveResource = (
        r?: PolicyRuleResource,
      ): PolicyRuleResource | undefined => {
        if (!r) return undefined;
        if (!r.id.startsWith("new-")) return r;
        const created = resourceClientToId.get(r.id);
        if (!created) {
          throw new Error(
            "A referenced resource is missing — it may have been removed from the draft.",
          );
        }
        return { id: created.id, type: created.type ?? r.type };
      };

      return {
        name: policy.name,
        description: policy.description ?? "",
        enabled: policy.enabled,
        query: policy.query ?? "",
        source_posture_checks: (
          (policy.source_posture_checks as unknown as
            | (PostureCheck | string)[]
            | undefined) ?? []
        ).map((c) => (typeof c === "string" ? c : c.id)),
        rules: [
          {
            name: policy.name,
            description: policy.description ?? "",
            bidirectional: rule.bidirectional,
            action: "accept",
            protocol: rule.protocol,
            enabled: rule.enabled,
            sources: rule.sourceResource
              ? undefined
              : resolveGroupIds(rule.sources as Group[]),
            destinations: rule.destinationResource
              ? undefined
              : resolveGroupIds(rule.destinations as Group[]),
            sourceResource: resolveResource(rule.sourceResource),
            destinationResource: resolveResource(rule.destinationResource),
            ports: isSsh ? ["22"] : rule.ports,
            port_ranges: isSsh ? [] : rule.port_ranges,
            authorized_groups: isSsh ? authorizedGroups : undefined,
          },
        ],
      };
    };

    const executeChange = async (change: DraftChange) => {
      switch (change.type) {
        case "create-group": {
          const created = await groupRequest.post({
            name: change.name,
            // Placeholder members that never installed keep their "draft-"
            // ids — those don't exist in the API and can't be deployed.
            peers: change.peerIds.filter((id) => !id.startsWith("draft-")),
            // Draft resources ("new-…") deploy after groups — membership is
            // applied through the resource's own `groups` field instead.
            resources: change.resourceIds.filter(
              (id) => !id.startsWith("new-"),
            ),
          });
          if (created?.id) nameToId.set(created.name, created.id);
          return;
        }
        case "update-group": {
          const base = groups?.find((g) => g.id === change.groupId);
          if (!base) throw new Error("Group no longer exists.");
          const peers = new Set(toIds(base.peers));
          const resources = new Set(toIds(base.resources));
          change.peerIds.forEach(
            (id) => !id.startsWith("draft-") && peers.add(id),
          );
          change.resourceIds.forEach(
            (id) => !id.startsWith("new-") && resources.add(id),
          );
          const updated = await groupRequest.put(
            {
              name: change.name,
              peers: Array.from(peers),
              resources: Array.from(resources),
            },
            `/${change.groupId}`,
          );
          if (updated?.id) nameToId.set(updated.name, updated.id);
          return;
        }
        case "create-network": {
          const created = await networkRequest.post({
            name: change.name,
            description: change.description ?? "",
          });
          if (created?.id) networkClientToId.set(change.clientId, created.id);
          return;
        }
        case "create-resource": {
          const networkId = resolveNetworkId(change);
          const created = await resourceRequest.post(
            {
              name: change.name,
              description: change.description ?? "",
              address: normalizeHostCIDR(change.address),
              enabled: true,
              // API ids pass through; draft-group names resolve via the
              // groups created earlier in this run.
              groups: change.groupIds.map((ref) => nameToId.get(ref) ?? ref),
            },
            `/${networkId}/resources`,
          );
          if (created?.id) {
            resourceClientToId.set(change.clientId, {
              id: created.id,
              type: created.type,
            });
          }
          return;
        }
        case "create-router": {
          const networkId = resolveNetworkId(change);
          // The live modal's defaults: metric 9999, masquerade on, enabled.
          await routerRequest.post(
            {
              ...(change.peerId
                ? { peer: change.peerId }
                : {
                    peer_groups: [
                      nameToId.get(change.groupId ?? "") ?? change.groupId,
                    ],
                  }),
              metric: 9999,
              masquerade: true,
              enabled: true,
            },
            `/${networkId}/routers`,
          );
          return;
        }
        case "create-policy": {
          await policyRequest.post(buildPolicyBody(change.policy));
          return;
        }
        case "update-policy": {
          await policyRequest.put(
            buildPolicyBody(change.policy),
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
      }
    };

    const order: DraftChange["type"][] = [
      "create-group",
      "update-group",
      "create-network",
      "create-resource",
      "create-router",
      "create-policy",
      "update-policy",
      "delete-policy",
      "delete-group",
    ];
    const ordered = [...changes].sort(
      (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
    );

    const run = async () => {
      for (const change of ordered) {
        try {
          await executeChange(change);
        } catch (err) {
          const label = getChangeLabel(change).title;
          const message =
            (err as { message?: string })?.message ?? "The API request failed.";
          // Failed + remaining changes stay in the draft for a retry.
          throw { message: `${label} — ${message}`, code: 0 };
        }
        removeChange(change.id);
      }
    };

    const promise = run();
    notify({
      title: "Deploy",
      description: `${ordered.length} change${
        ordered.length !== 1 ? "s" : ""
      } deployed successfully.`,
      loadingMessage: "Deploying changes...",
      promise,
    });

    try {
      await promise;
      return true;
    } catch {
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
    groupRequest,
    policyRequest,
    networkRequest,
    resourceRequest,
    routerRequest,
    removeChange,
  ]);

  return { deploy, isDeploying };
}
