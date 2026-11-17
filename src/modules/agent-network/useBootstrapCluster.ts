"use client";

import useFetchApi from "@utils/api";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  ReverseProxyDomain,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";

export function useBootstrapCluster(enabled = true) {
  const { settings, settingsLoading } = useAIProviders();
  const { permission } = usePermissions();

  const bootstrapped = !!settings;

  // Delegated Agent Network roles lack Services read,
  // so /reverse-proxies/domains would only 403 for them.
  const canReadDomains = !!permission.services?.read;
  const { data: domains, isLoading: domainsLoading } = useFetchApi<
    ReverseProxyDomain[]
  >(
    "/reverse-proxies/domains",
    true,
    true,
    enabled && canReadDomains && !bootstrapped && !settingsLoading,
  );

  const validatedClusters = useMemo(
    () =>
      (domains ?? []).filter(
        (d) => d.type === ReverseProxyDomainType.FREE && d.validated,
      ),
    [domains],
  );

  // Only an explicit false disqualifies a cluster:
  // management builds that predate the flag report nothing at all.
  const bootstrapClusters = useMemo(
    () => validatedClusters.filter((d) => d.supports_private !== false),
    [validatedClusters],
  );

  const noClustersAvailable =
    !bootstrapped &&
    !settingsLoading &&
    !domainsLoading &&
    bootstrapClusters.length === 0;

  const clustersLackPrivateCapability =
    noClustersAvailable && validatedClusters.length > 0;

  return {
    bootstrapped,
    canReadDomains,
    cluster: bootstrapClusters[0]?.domain ?? "",
    validatedClusters,
    noClustersAvailable,
    clustersLackPrivateCapability,
    loading: settingsLoading || domainsLoading,
  };
}
