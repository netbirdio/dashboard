"use client";

import useFetchApi from "@utils/api";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  ReverseProxyDomain,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";

/**
 * The proxy cluster an account's Agent Network endpoint gets bootstrapped onto,
 * and whether there is one at all.
 *
 * The endpoint lives on the account-level settings row, written once by an
 * explicit POST just before the first provider is created — so until that has
 * happened, connecting a provider depends on a cluster being available to
 * bootstrap onto. Nothing later does: once settings carry an endpoint, no
 * further bootstrap runs and `/domains` is not even fetched.
 *
 * Shared rather than local to the Connect Provider wizard because the wizard is
 * no longer the only thing that needs the verdict: the assistant has to know
 * whether opening that wizard can lead anywhere before it opens one and waits
 * on a person (see CanvasAgentBridge's `new_provider`).
 */
export function useBootstrapCluster() {
  const { settings, settingsLoading } = useAIProviders();
  const { permission } = usePermissions();

  const bootstrapped = !!settings;

  // /reverse-proxies/domains is guarded by the Services module, which the
  // delegated Agent Network roles don't hold — calling it for them only yields
  // a 403. The list is needed for the one-time bootstrap cluster pick, so skip
  // the request once the account is bootstrapped or the role can't read it.
  const canReadDomains = !!permission.services?.read;
  const { data: domains, isLoading: domainsLoading } = useFetchApi<
    ReverseProxyDomain[]
  >(
    "/reverse-proxies/domains",
    true,
    true,
    canReadDomains && !bootstrapped && !settingsLoading,
  );

  const validatedClusters = useMemo(
    () =>
      (domains ?? []).filter(
        (d) => d.type === ReverseProxyDomainType.FREE && d.validated,
      ),
    [domains],
  );

  /*
    Not every live cluster can host the endpoint. The agent network gateway is
    a private service — reachable only from connected peers, authenticated by
    their tunnel identity — so it needs a cluster with private capabilities.
    supports_private is the flag for that, the same one the Reverse Proxy modal
    gates NetBird-Only Access on, and management refuses a bootstrap onto a
    cluster reporting it false. Picking from the filtered list keeps the wizard
    from proposing a cluster the API rejects — and the endpoint it assigns is
    immutable, so a wrong pick is not something the operator can edit away
    afterwards.

    Only an explicit false disqualifies a cluster: a management build that
    predates the flag reports nothing at all, and dropping every cluster there
    would block setup on a backend that would have accepted it — the same
    "nothing to judge" reading the server applies to an unreported capability.
  */
  const bootstrapClusters = useMemo(
    () => validatedClusters.filter((d) => d.supports_private !== false),
    [validatedClusters],
  );

  // Wait for both requests before claiming there is nothing to pick, otherwise
  // the warning flashes while the settings row is still loading.
  const noClustersAvailable =
    !bootstrapped && !settingsLoading && !domainsLoading && bootstrapClusters.length === 0;

  // Clusters exist, but none of them has private capabilities: a different
  // problem from having no proxy at all, and a different fix, so it gets its
  // own message rather than "connect a proxy".
  const clustersLackPrivateCapability =
    noClustersAvailable && validatedClusters.length > 0;

  return {
    /** True once the account has an endpoint; no cluster is involved after that. */
    bootstrapped,
    canReadDomains,
    /** The cluster the first create will bootstrap onto, empty until one lands. */
    cluster: bootstrapClusters[0]?.domain ?? "",
    validatedClusters,
    noClustersAvailable,
    clustersLackPrivateCapability,
    loading: settingsLoading || domainsLoading,
  };
}
