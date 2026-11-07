import { describe, expect, it } from "vitest";
import {
  agentNetworkHome,
  hasAgentNetworkGrant,
  productForPath,
  showProductSwitch,
} from "@/modules/agent-network/product";

describe("productForPath", () => {
  it.each([
    ["/agent-network", "agent-network"],
    ["/agent-network/", "agent-network"],
    ["/agent-network/providers", "agent-network"],
    ["/agent-network/usage", "agent-network"],
    ["/agent-networks", "networking"],
    ["/agent-network-foo", "networking"],
    ["/peers", "networking"],
    ["/control-center", "networking"],
    ["/team/users", "networking"],
    ["/", "networking"],
    ["", "networking"],
    [null, "networking"],
    [undefined, "networking"],
  ])("%s is %s", (path, product) => {
    expect(productForPath(path)).toBe(product);
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
