import { describe, expect, it } from "vitest";
import {
  domainSupportsTargetAccessControl,
  sanitizeTargets,
} from "@/contexts/ReverseProxiesProvider";
import {
  ReverseProxy,
  ReverseProxyDomain,
  ReverseProxyDomainType,
  ReverseProxyTargetProtocol,
  ReverseProxyTargetType,
  TargetAccessAction,
} from "@/interfaces/ReverseProxy";

describe("sanitizeTargets", () => {
  it("preserves target access actions while removing frontend-only fields", () => {
    const [target] = sanitizeTargets([
      {
        target_type: ReverseProxyTargetType.PEER,
        target_id: "peer-1",
        protocol: ReverseProxyTargetProtocol.HTTP,
        host: "100.64.0.1",
        port: 80,
        enabled: true,
        access_action: TargetAccessAction.BYPASS,
        destination: "http://100.64.0.1",
      },
    ]);

    expect(target.access_action).toBe(TargetAccessAction.BYPASS);
    expect(target).not.toHaveProperty("destination");
    expect(target).not.toHaveProperty("host");
  });
});

describe("domainSupportsTargetAccessControl", () => {
  const proxy: ReverseProxy = {
    name: "api.example.com",
    domain: "api.example.com",
    targets: [],
    enabled: true,
  };

  const domain = (
    overrides: Partial<ReverseProxyDomain>,
  ): ReverseProxyDomain => ({
    id: "domain-1",
    domain: "example.com",
    validated: true,
    type: ReverseProxyDomainType.FREE,
    ...overrides,
  });

  it("does not treat missing target_cluster values as a cluster match", () => {
    expect(
      domainSupportsTargetAccessControl(
        { ...proxy, domain: "api.unrelated.test" },
        [domain({ supports_target_access_control: true })],
      ),
    ).toBe(false);
  });

  it("uses an exact proxy cluster capability before domain suffix fallback", () => {
    expect(
      domainSupportsTargetAccessControl(
        { ...proxy, proxy_cluster: "cluster.example.com" },
        [
          domain({ supports_target_access_control: true }),
          domain({
            id: "cluster-domain",
            domain: "cluster.example.com",
            supports_target_access_control: false,
          }),
        ],
      ),
    ).toBe(false);
  });

  it("falls back to the service domain when proxy_cluster is absent", () => {
    expect(
      domainSupportsTargetAccessControl(proxy, [
        domain({ supports_target_access_control: true }),
      ]),
    ).toBe(true);
  });
});
