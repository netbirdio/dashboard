import { useMemo, useState } from "react";
import {
  isL4Mode,
  ReverseProxy,
  ReverseProxyDomain,
  ReverseProxyDomainType,
  ReverseProxyPortMapping,
  ServiceMode,
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
  serviceMode: ServiceMode;
  portMappings: ReverseProxyPortMapping[];
};

const canonicalDomain = (domain: string) =>
  domain.trim().toLowerCase().replace(/\.+$/, "");

export function useReverseProxyDomain({
  reverseProxy,
  domains,
  initialSubdomain,
  serviceMode,
  portMappings,
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
    const candidateDomain = canonicalDomain(fullDomain);

    const candidateIsL4 = isL4Mode(serviceMode);
    const candidateHasTLS =
      serviceMode === ServiceMode.TLS ||
      portMappings.some((mapping) => mapping.protocol === ServiceMode.TLS);

    // HTTP may share a hostname with raw TCP/UDP services. It retains one HTTP
    // owner, while TLS passthrough remains exclusive because it also routes by
    // hostname. Listener-range conflicts between L4 services are validated by
    // management.
    return reverseProxies.some((proxy) => {
      if (
        canonicalDomain(proxy.domain) !== candidateDomain ||
        proxy.id === reverseProxy?.id
      ) {
        return false;
      }

      const existingIsL4 = isL4Mode(proxy.mode);
      const existingHasTLS =
        proxy.mode === ServiceMode.TLS ||
        proxy.port_mappings?.some(
          (mapping) => mapping.protocol === ServiceMode.TLS,
        ) === true;

      return (
        (!candidateIsL4 && !existingIsL4) ||
        (!candidateIsL4 && existingHasTLS) ||
        (candidateHasTLS && !existingIsL4)
      );
    });
  }, [reverseProxies, fullDomain, reverseProxy?.id, serviceMode, portMappings]);

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
