import type { Peer } from "@/interfaces/Peer";
import {
  isClusterConnected,
  ReverseProxyCluster,
  ReverseProxyClusterType,
} from "@/interfaces/ReverseProxy";
import type {
  AgentPolicy,
  AIProvider,
} from "@/modules/agent-network/data/mockData";
import { MANAGED_PROXY_STATE } from "@/modules/agent-network/managedProxyState";
import {
  AGENT_STEP,
  AgentStep,
} from "@/modules/onboarding/agent-network/agentNetworkSteps";

// Seconds still provisioning before the managed view says the rollout is slow.
// It is only a hint: the client never decides a rollout has failed.
export const MANAGED_SLOW_HINT_AFTER_S = 120;
// Seconds without a newly deployed proxy registering before the gateway step
// points at the usual causes.
export const SELF_DEPLOY_HINT_AFTER_S = 300;

// privateAccountClusters returns the proxies the account runs itself that can
// already serve Agent Network: online, connected, and private. The choice
// screen offers each of them next to the managed gateway and a new proxy.
// Shared clusters are NetBird-operated and never count, or every Cloud
// account would be offered a proxy it does not run.
export function privateAccountClusters(
  clusters?: ReverseProxyCluster[],
): ReverseProxyCluster[] {
  return (clusters ?? []).filter(
    (c) =>
      c.type === ReverseProxyClusterType.ACCOUNT &&
      isClusterConnected(c) &&
      c.private === true,
  );
}

export type GatewayEntry =
  | { kind: "loading" }
  // A managed deployment is not ready yet: show its state and poll it, never
  // POST.
  | { kind: "managed" }
  // The account's endpoint is served already: skip the step.
  | { kind: "configured" }
  | { kind: "choice" };

// resolveGatewayEntry decides where the gateway step opens once the settings,
// the managed deployment and the clusters have loaded. The managed deployment
// is checked first: its POST writes the settings row before the gateway is
// ready, so a settings endpoint alone does not mean the gateway works.
export function resolveGatewayEntry(input: {
  loading: boolean;
  managedExists: boolean;
  managedReady?: boolean;
  settingsEndpoint?: string;
}): GatewayEntry {
  if (input.loading) return { kind: "loading" };
  if (input.managedExists && !(input.managedReady && input.settingsEndpoint)) {
    return { kind: "managed" };
  }
  if (input.settingsEndpoint) return { kind: "configured" };
  return { kind: "choice" };
}

export type StageStatus = "done" | "active" | "pending" | "failed";

export type ManagedStages = {
  reserve: StageStatus;
  deploy: StageStatus;
  connect: StageStatus;
};

// managedGatewayStages maps the deployment state onto the setup checklist.
// state is undefined until the POST answers with a deployment. The API reports
// no progress finer than its states, so while provisioning the deploy stage
// spins and the connect stage waits; both complete at ready.
export function managedGatewayStages(state?: string): ManagedStages {
  if (state === undefined) {
    return { reserve: "active", deploy: "pending", connect: "pending" };
  }
  switch (state) {
    case MANAGED_PROXY_STATE.READY:
      return { reserve: "done", deploy: "done", connect: "done" };
    case MANAGED_PROXY_STATE.PROVISIONING:
      return { reserve: "done", deploy: "active", connect: "pending" };
    case MANAGED_PROXY_STATE.FAILED:
      return { reserve: "done", deploy: "failed", connect: "pending" };
    default:
      return { reserve: "done", deploy: "pending", connect: "pending" };
  }
}

export type SelfDeployPhase =
  // The install instructions are up; no cluster with that domain yet.
  | "waiting"
  // The cluster is known but has no connected proxy yet.
  | "found"
  // Registered, but no private proxy, which Agent Network needs.
  | "not-private"
  // Registered and private: the settings can be bootstrapped on it.
  | "connected";

export function selfDeployPhase(
  cluster?: ReverseProxyCluster,
): SelfDeployPhase {
  if (!cluster) return "waiting";
  if (!isClusterConnected(cluster)) return "found";
  return cluster.private === true ? "connected" : "not-private";
}

// formatElapsed renders seconds as m:ss.
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const rest = String(total % 60).padStart(2, "0");
  return `${Math.floor(total / 60)}:${rest}`;
}

export type LiveChecklist = {
  provider: boolean;
  policy: boolean;
  peer: boolean;
};

// liveChecklist checks what has to hold besides a ready gateway before an
// agent's requests go through: an enabled provider, an enabled policy, and a
// connected peer in a source group of an enabled policy.
export function liveChecklist(input: {
  providers: Pick<AIProvider, "enabled">[];
  policies: Pick<AgentPolicy, "enabled" | "sourceGroups">[];
  peers: Pick<Peer, "connected" | "groups">[];
}): LiveChecklist {
  const enabledPolicies = input.policies.filter((p) => p.enabled);
  const sourceGroups = new Set(enabledPolicies.flatMap((p) => p.sourceGroups));
  return {
    provider: input.providers.some((p) => p.enabled),
    policy: enabledPolicies.length > 0,
    peer: input.peers.some(
      (peer) =>
        peer.connected &&
        (peer.groups ?? []).some((g) => !!g.id && sourceGroups.has(g.id)),
    ),
  };
}

export type ChecklistItem = keyof LiveChecklist;

// checklistFix names the onboarding step that fixes an unmet checklist item.
// The policy step fixes the policy where the flow has one; otherwise the
// provider step, which creates the policy. A missing peer is the device step's
// to fix until a device is connected, and then the policy's source groups.
export function checklistFix(
  item: ChecklistItem,
  flow: { policyStep: boolean; deviceConnected: boolean },
): AgentStep {
  const policy = flow.policyStep ? AGENT_STEP.POLICY : AGENT_STEP.PROVIDER;
  if (item === "provider") return AGENT_STEP.PROVIDER;
  if (item === "policy") return policy;
  return flow.deviceConnected ? policy : AGENT_STEP.DEVICE;
}
