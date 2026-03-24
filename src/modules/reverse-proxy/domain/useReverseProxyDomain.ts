import { useMemo, useState } from "react";
import {
  ReverseProxy,
  ReverseProxyDomain,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";

// Helper to parse domain into subdomain and base domain.
// When availableDomains is provided, matches against them first (longest match wins)
// to avoid e.g. "netbird.io" matching when the actual domain is "eu.proxy.netbird.io".
function parseDomain(
  fullDomain: string,
  availableDomains?: ReverseProxyDomain[],
): {
  subdomain: string;
  baseDomain: string;
  isCustom: boolean;
} {
  // Try matching against actual available domains first (sorted longest-first for specificity)
  if (availableDomains?.length) {
    const sorted = [...availableDomains]
      .filter((d) => d.domain)
      .sort((a, b) => b.domain.length - a.domain.length);
    for (const d of sorted) {
      if (fullDomain === d.domain) {
        return {
          subdomain: "",
          baseDomain: d.domain,
          isCustom: d.type === ReverseProxyDomainType.CUSTOM,
        };
      }
      if (fullDomain.endsWith(`.${d.domain}`)) {
        return {
          subdomain: fullDomain.slice(0, -(d.domain.length + 1)),
          baseDomain: d.domain,
          isCustom: d.type === ReverseProxyDomainType.CUSTOM,
        };
      }
    }
  }

  // Fallback to hardcoded known domains
  const knownDomains = ["netbird.cloud", "netbird.io", "netbird.app"];

  for (const known of knownDomains) {
    if (fullDomain.endsWith(`.${known}`)) {
      return {
        subdomain: fullDomain.slice(0, -(known.length + 1)),
        baseDomain: known,
        isCustom: false,
      };
    }
  }

  // Custom domain - find the first dot to split
  const firstDot = fullDomain.indexOf(".");
  if (firstDot > 0) {
    return {
      subdomain: fullDomain.slice(0, firstDot),
      baseDomain: fullDomain.slice(firstDot + 1),
      isCustom: true,
    };
  }

  return {
    subdomain: fullDomain,
    baseDomain: "netbird.cloud",
    isCustom: false,
  };
}

type UseReverseProxyDomainOptions = {
  reverseProxy?: ReverseProxy;
  domains?: ReverseProxyDomain[];
  initialSubdomain?: string;
};

export function useReverseProxyDomain({
  reverseProxy,
  domains,
  initialSubdomain,
}: UseReverseProxyDomainOptions) {
  const { reverseProxies } = useReverseProxies();

  const parsed = reverseProxy?.domain
    ? parseDomain(reverseProxy.domain, domains)
    : null;

  const [subdomain, setSubdomain] = useState(() => {
    return (
      parsed?.subdomain ||
      initialSubdomain
        ?.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") ||
      ""
    );
  });

  const [baseDomain, setBaseDomain] = useState(() => {
    if (parsed?.baseDomain) return parsed.baseDomain;
    const validatedDomains = domains?.filter((d) => d.validated) || [];
    const customDomain = validatedDomains.find(
      (d) => d.type === ReverseProxyDomainType.CUSTOM,
    );
    const freeDomain = validatedDomains.find(
      (d) => d.type === ReverseProxyDomainType.FREE,
    );
    return customDomain?.domain || freeDomain?.domain || "";
  });

  const fullDomain = baseDomain
    ? subdomain
      ? `${subdomain}.${baseDomain}`
      : baseDomain
    : subdomain;

  const domainAlreadyExists = useMemo(() => {
    if (!reverseProxies || !fullDomain) return false;
    return reverseProxies.some(
      (p) => p.domain === fullDomain && p.id !== reverseProxy?.id,
    );
  }, [reverseProxies, fullDomain, reverseProxy?.id]);

  const isClusterConnected = useMemo(() => {
    if (!reverseProxy?.proxy_cluster) return false;
    return domains?.some(
      (d) =>
        d.type === ReverseProxyDomainType.FREE &&
        d.domain === reverseProxy.proxy_cluster,
    );
  }, [reverseProxy?.proxy_cluster, domains]);

  return {
    subdomain,
    setSubdomain,
    baseDomain,
    setBaseDomain,
    fullDomain,
    domainAlreadyExists,
    isClusterConnected,
  };
}
