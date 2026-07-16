import { useCallback, useState } from "react";
import { mutate } from "swr";
import { useApiCall } from "@utils/api";
import { notify } from "@components/Notification";
import { Group, GroupPeer, GroupResource } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
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
  const [isDeploying, setIsDeploying] = useState(false);

  const deploy = useCallback(async (): Promise<boolean> => {
    setIsDeploying(true);

    // Group name → id, updated as groups get created during the deploy.
    const nameToId = new Map<string, string>();
    groups?.forEach((g) => g.id && nameToId.set(g.name, g.id));

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
            sourceResource: rule.sourceResource || undefined,
            destinationResource: rule.destinationResource || undefined,
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
            resources: change.resourceIds,
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
          change.resourceIds.forEach((id) => resources.add(id));
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
      await Promise.all([mutate("/groups"), mutate("/policies")]).catch(
        () => {},
      );
      setIsDeploying(false);
    }
  }, [changes, groups, groupRequest, policyRequest, removeChange]);

  return { deploy, isDeploying };
}
