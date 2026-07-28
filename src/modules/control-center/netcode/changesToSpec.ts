import { normalizeHostCIDR } from "@utils/ip";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import {
  NetCodeAccountSpec,
  NetCodeGroup,
  NetCodeNetwork,
  NetCodeNetworkResource,
  NetCodeNetworkRouter,
  NetCodePolicy,
  NetCodeResourceRef,
} from "@/interfaces/NetCode";
import { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";

// Translates the draft changeset onto a freshly exported netcode spec,
// producing the full desired state the backend diffs and commits. Mirrors
// useDeployChangeset's REST semantics: draft groups are referenced by name
// and get their client id as spec id (kept by the backend), draft networks
// and resources keep their "new-…" client ids as placeholders (the backend
// remaps them to store-generated ids during the commit), placeholder peers
// ("draft-…") never deploy, and install-peer entries are user steps.

type TranslateContext = {
  networkResources: NetworkResource[] | undefined;
};

const draftGroupSpecId = (clientId: string) =>
  clientId.replace(/^group-/, "");

const toPostureCheckIds = (
  checks: Policy["source_posture_checks"] | undefined,
): string[] | undefined => {
  const ids = ((checks as unknown as (PostureCheck | string)[]) ?? [])
    .map((c) => (typeof c === "string" ? c : c.id))
    .filter(Boolean) as string[];
  return ids.length > 0 ? ids : undefined;
};

export function changesToSpec(
  spec: NetCodeAccountSpec,
  changes: DraftChange[],
  context: TranslateContext,
): NetCodeAccountSpec {
  const groups: NetCodeGroup[] = [...(spec.groups ?? [])];
  const policies: NetCodePolicy[] = [...(spec.policies ?? [])];
  const networks: NetCodeNetwork[] = [...(spec.networks ?? [])];
  const networkResources: NetCodeNetworkResource[] = [
    ...(spec.networkResources ?? []),
  ];
  const networkRouters: NetCodeNetworkRouter[] = [
    ...(spec.networkRouters ?? []),
  ];

  // Group name → spec id, covering existing groups and draft creations, so
  // policy/resource/router references by name resolve.
  const nameToId = new Map<string, string>();
  groups.forEach((g) => nameToId.set(g.name, g.id));
  // Draft-created and renamed groups too — references by the new name must
  // resolve (mirrors the REST deploy refreshing the map after each group op)
  changes.forEach((change) => {
    if (change.type === "create-group") {
      nameToId.set(change.name, draftGroupSpecId(change.clientId));
    } else if (change.type === "update-group") {
      nameToId.set(change.name, change.groupId);
    }
  });

  // Draft resources are only referenceable while their create change exists
  const draftResourceIds = new Set(
    changes.flatMap((c) => (c.type === "create-resource" ? [c.clientId] : [])),
  );

  // A previous deploy may have applied some creates before failing (the
  // backend has no cross-resource transaction). Those entities now exist in
  // the fresh export under store-generated ids, so a retry must adopt them
  // instead of appending the placeholder again and creating duplicates.
  const adopted = new Map<string, string>();

  const resolveGroupRef = (ref: Group | string): string => {
    if (typeof ref === "string") return nameToId.get(ref) ?? ref;
    const id = ref.id ?? nameToId.get(ref.name);
    if (!id) {
      throw new Error(
        `Group "${ref.name}" is missing — it may have been removed from the draft.`,
      );
    }
    return id;
  };

  const resourceType = (id: string): string => {
    const resource = context.networkResources?.find((r) => r.id === id);
    return resource?.type ?? "host";
  };

  const toGroupResourceRefs = (resourceIds: string[]): NetCodeResourceRef[] =>
    resourceIds
      // Draft resources ("new-…") carry their membership on the resource's
      // own groups field — same inversion the REST deploy uses.
      .map((id) => adopted.get(id) ?? id)
      .filter((id) => !id.startsWith("new-"))
      .map((id) => ({ type: resourceType(id), address: id }));

  const toNetCodePolicy = (id: string, policy: Policy): NetCodePolicy => {
    const rule = policy.rules?.[0];
    if (!rule) throw new Error("Policy has no rule.");

    const isSsh = rule.protocol === "netbird-ssh";
    const authorizedGroups: Record<string, string[]> = {};
    if (isSsh && rule.authorized_groups) {
      Object.entries(rule.authorized_groups).forEach(
        ([nameOrId, usernames]) => {
          authorizedGroups[nameToId.get(nameOrId) ?? nameOrId] =
            usernames as string[];
        },
      );
    }

    const toResourceRef = (
      r?: PolicyRuleResource,
    ): NetCodeResourceRef | undefined => {
      if (!r?.id) return undefined;
      const address = adopted.get(r.id) ?? r.id;
      if (address.startsWith("new-") && !draftResourceIds.has(address)) {
        throw new Error(
          "A referenced resource is missing — it may have been removed from the draft.",
        );
      }
      return { type: r.type ?? "host", address };
    };

    const toRefs = (
      refs: Group[] | string[] | null | undefined,
    ): string[] | undefined => {
      if (!refs) return undefined;
      const ids = (refs as (Group | string)[]).map(resolveGroupRef);
      return ids.length > 0 ? ids : undefined;
    };

    const ports = isSsh ? ["22"] : [...(rule.ports ?? [])];
    if (!isSsh) {
      rule.port_ranges?.forEach((range) => {
        ports.push(
          range.start === range.end
            ? `${range.start}`
            : `${range.start}-${range.end}`,
        );
      });
    }

    return {
      id,
      name: policy.name,
      description: policy.description ?? "",
      enabled: policy.enabled,
      sourcePostureChecks: toPostureCheckIds(policy.source_posture_checks),
      rules: [
        {
          id: rule.id ?? "",
          name: policy.name,
          description: policy.description ?? "",
          enabled: rule.enabled,
          action: rule.action || "accept",
          protocol: rule.protocol,
          ports: ports.length > 0 ? ports : undefined,
          sources: rule.sourceResource ? undefined : toRefs(rule.sources),
          destinations: rule.destinationResource
            ? undefined
            : toRefs(rule.destinations),
          sourceResource: toResourceRef(rule.sourceResource),
          destinationResource: toResourceRef(rule.destinationResource),
          bidirectional: rule.bidirectional,
          authorizedGroups:
            isSsh && Object.keys(authorizedGroups).length > 0
              ? authorizedGroups
              : undefined,
        },
      ],
    };
  };

  const resolveNetworkRef = (change: {
    networkId?: string;
    networkClientId?: string;
    networkName: string;
  }): string => {
    const id = change.networkId ?? change.networkClientId;
    if (!id) {
      throw new Error(
        `Network "${change.networkName}" is missing — it may have been removed from the draft.`,
      );
    }
    return adopted.get(id) ?? id;
  };

  for (const change of changes) {
    switch (change.type) {
      case "create-group": {
        groups.push({
          id: draftGroupSpecId(change.clientId),
          name: change.name,
          issued: "api",
          peers: change.peerIds.filter((id) => !id.startsWith("draft-")),
          resources: toGroupResourceRefs(change.resourceIds),
        });
        break;
      }
      case "update-group": {
        const index = groups.findIndex((g) => g.id === change.groupId);
        if (index < 0) break;
        const group = { ...groups[index] };
        group.name = change.name;
        const peers = new Set(group.peers ?? []);
        change.peerIds.forEach(
          (id) => !id.startsWith("draft-") && peers.add(id),
        );
        change.removedPeerIds?.forEach((id) => peers.delete(id));
        group.peers = Array.from(peers);
        const resources = [...(group.resources ?? [])];
        toGroupResourceRefs(change.resourceIds).forEach((ref) => {
          if (!resources.some((existing) => existing.address === ref.address)) {
            resources.push(ref);
          }
        });
        group.resources = resources.filter(
          (ref) => !change.removedResourceIds?.includes(ref.address),
        );
        groups[index] = group;
        break;
      }
      case "delete-group": {
        const index = groups.findIndex((g) => g.id === change.groupId);
        if (index >= 0) groups.splice(index, 1);
        break;
      }
      case "create-policy": {
        policies.push(toNetCodePolicy(change.clientId, change.policy));
        break;
      }
      case "update-policy": {
        const index = policies.findIndex((p) => p.id === change.policyId);
        if (index < 0) break;
        policies[index] = toNetCodePolicy(change.policyId, change.policy);
        break;
      }
      case "delete-policy": {
        const index = policies.findIndex((p) => p.id === change.policyId);
        if (index >= 0) policies.splice(index, 1);
        break;
      }
      case "create-network": {
        const existing = networks.find((n) => n.name === change.name);
        if (existing) {
          adopted.set(change.clientId, existing.id);
          break;
        }
        networks.push({
          id: change.clientId,
          name: change.name,
          description: change.description ?? "",
        });
        break;
      }
      case "create-resource": {
        const networkId = resolveNetworkRef(change);
        const existing = networkResources.find(
          (r) => r.networkId === networkId && r.name === change.name,
        );
        if (existing) {
          adopted.set(change.clientId, existing.id);
          break;
        }
        networkResources.push({
          id: change.clientId,
          networkId,
          name: change.name,
          description: change.description ?? "",
          address: normalizeHostCIDR(change.address),
          groups: change.groupIds.map((ref) => nameToId.get(ref) ?? ref),
          enabled: change.enabled ?? true,
        });
        break;
      }
      case "update-resource": {
        const index = networkResources.findIndex(
          (r) => r.id === change.resourceId,
        );
        if (index < 0) break;
        networkResources[index] = {
          ...networkResources[index],
          name: change.name,
          description: change.description ?? "",
          address: normalizeHostCIDR(change.address),
          groups: change.groupIds.map((ref) => nameToId.get(ref) ?? ref),
          enabled: change.enabled,
        };
        break;
      }
      case "delete-resource": {
        const index = networkResources.findIndex(
          (r) => r.id === change.resourceId,
        );
        if (index >= 0) networkResources.splice(index, 1);
        break;
      }
      case "create-router": {
        // Routers referencing a placeholder peer stay out of the changeset
        // until the peer installs — mirrored here defensively.
        if (change.peerId?.startsWith("draft-")) break;
        const routerNetworkId = resolveNetworkRef(change);
        const routerPeerGroup = change.groupId
          ? nameToId.get(change.groupId) ?? change.groupId
          : undefined;
        const existingRouter = networkRouters.find(
          (r) =>
            r.networkId === routerNetworkId &&
            (change.peerId
              ? r.peer === change.peerId
              : !!routerPeerGroup && r.peerGroups?.includes(routerPeerGroup)),
        );
        if (existingRouter) break;
        networkRouters.push({
          id: change.clientId,
          networkId: routerNetworkId,
          peer: change.peerId || undefined,
          peerGroups: routerPeerGroup ? [routerPeerGroup] : undefined,
          metric: change.metric ?? 9999,
          masquerade: change.masquerade ?? true,
          enabled: change.enabled ?? true,
        });
        break;
      }
      case "install-peer":
        break;
    }
  }

  return {
    ...spec,
    groups,
    policies,
    networks,
    networkResources,
    networkRouters,
  };
}
