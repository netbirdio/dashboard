import { describe, expect, it } from "vitest";
import {
  agentNetworkHome,
  hasAgentNetworkGrant,
  productForPath,
  showProductSwitch,
} from "@/modules/agent-network/product";

describe("productForPath", () => {
  it.each([
    // Agent Network pages are Agent Network, whatever the current product.
    ["/agent-network", undefined, "agent-network"],
    ["/agent-network/", "networking", "agent-network"],
    ["/agent-network/providers", "networking", "agent-network"],
    ["/agent-network/usage", undefined, "agent-network"],
    // Pages only Networking has are Networking, whatever the current product.
    ["/networks", "agent-network", "networking"],
    ["/network", "agent-network", "networking"],
    ["/network-routes", "agent-network", "networking"],
    ["/reverse-proxy/services", "agent-network", "networking"],
    ["/dns/zones", "agent-network", "networking"],
    ["/events/audit", "agent-network", "networking"],
    // Pages both products show keep the current product.
    ["/peers", "agent-network", "agent-network"],
    ["/peer", "agent-network", "agent-network"],
    ["/control-center", "agent-network", "agent-network"],
    ["/access-control", "agent-network", "agent-network"],
    ["/team/users", "agent-network", "agent-network"],
    ["/settings", "agent-network", "agent-network"],
    ["/peers", "networking", "networking"],
    // ... and are Networking when there is no current product yet.
    ["/peers", undefined, "networking"],
    ["/control-center", undefined, "networking"],
    // Look-alike paths are not the sections they resemble.
    ["/agent-networks", "networking", "networking"],
    ["/agent-network-foo", "networking", "networking"],
    ["/dnssec", "agent-network", "agent-network"],
    ["/", undefined, "networking"],
    ["", "agent-network", "agent-network"],
    [null, undefined, "networking"],
    [undefined, undefined, "networking"],
  ] as const)("%s from %s is %s", (path, current, product) => {
    expect(productForPath(path, current)).toBe(product);
  });
});

describe("hasAgentNetworkGrant", () => {
  it.each([
    [undefined, false],
    [{}, false],
    [{ "agent_network.providers": { read: false } }, false],
    [{ "agent_network.providers": { read: true } }, true],
    [{ "agent_network.policies": { read: true } }, true],
    [{ "agent_network.usage": { read: true } }, true],
    [{ "agent_network.logs": { read: true } }, true],
    [{ "agent_network.settings": { read: true } }, true],
  ])("%j is %s", (permission, expected) => {
    expect(hasAgentNetworkGrant(permission)).toBe(expected);
  });
});

describe("agentNetworkHome", () => {
  it("opens providers for callers who can read them", () => {
    expect(
      agentNetworkHome({ "agent_network.providers": { read: true } }),
    ).toBe("/agent-network/providers");
  });
  it("opens Connect Agent for everyone else", () => {
    expect(agentNetworkHome({ "agent_network.usage": { read: true } })).toBe(
      "/agent-network/connect",
    );
    expect(agentNetworkHome(undefined)).toBe("/agent-network/connect");
  });
});

describe("showProductSwitch", () => {
  it.each([
    [{ enabled: true, only: false, hasAccess: true }, true],
    [{ enabled: false, only: false, hasAccess: true }, false],
    [{ enabled: true, only: true, hasAccess: true }, false],
    [{ enabled: true, only: false, hasAccess: false }, false],
  ])("%j is %s", (input, expected) => {
    expect(showProductSwitch(input)).toBe(expected);
  });
});
