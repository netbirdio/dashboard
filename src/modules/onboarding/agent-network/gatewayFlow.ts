import {
  isClusterConnected,
  ReverseProxyCluster,
  ReverseProxyClusterType,
} from "@/interfaces/ReverseProxy";
import { MANAGED_PROXY_STATE } from "@/modules/agent-network/managedProxyState";

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
