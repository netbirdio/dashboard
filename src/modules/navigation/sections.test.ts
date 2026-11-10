import { describe, expect, it } from "vitest";
import {
  agentNetworkPageAccess,
  hasAgentNetworkGrant,
  hasNetworkingAccess,
  isSectionOpen,
  NAV_SECTION_ROUTES,
  type NavSectionInput,
  openSections,
  sectionsForPath,
  setSectionOpen,
  showAgentNetworkSection,
  showNetworkingSection,
  visibleSections,
} from "@/modules/navigation/sections";

describe("sectionsForPath", () => {
  it.each([
    // Pages both products use belong to no section.
    ["/control-center", []],
    ["/peers", []],
    ["/peer", []],
    ["/team/users", []],
    ["/team/service-users", []],
    ["/team/user", []],
    ["/groups", []],
    ["/group", []],
    // Networking.
    ["/access-control", ["networking"]],
    ["/posture-checks", ["networking"]],
    ["/networks", ["networking"]],
    ["/network", ["networking"]],
    ["/network-routes", ["networking"]],
    ["/reverse-proxy/services", ["networking"]],
    ["/dns/zones", ["networking"]],
    ["/events/traffic", ["networking"]],
    // Agent Network, Insights placeholders included.
    ["/agent-network/usage", ["agent-network"]],
    ["/agent-network/policies", ["agent-network"]],
    ["/agent-network/insights/models", ["agent-network"]],
    // The account area.
    ["/settings", ["account"]],
    ["/integrations", ["account"]],
    ["/events/audit", ["account"]],
    ["/tenants", ["account"]],
    // Look-alike paths are not the sections they resemble.
    ["/dnssec", []],
    ["/agent-networks", []],
    ["/events", []],
    ["/", []],
    ["", []],
    [null, []],
    [undefined, []],
  ] as const)("%s is in %j", (path, sections) => {
    expect(sectionsForPath(path)).toEqual(sections);
  });

  it("lists every page in at most one section", () => {
    const roots = Object.values(NAV_SECTION_ROUTES).flat();
    expect(new Set(roots).size).toBe(roots.length);
  });
});

const input = (overrides: Partial<NavSectionInput> = {}): NavSectionInput => ({
  agentNetworkOnly: false,
  agentNetworkEnabled: true,
  agentNetworkAccess: true,
  networkingAccess: true,
  ...overrides,
});

describe("section visibility", () => {
  it("shows both products and the account area", () => {
    expect(visibleSections(input())).toEqual([
      "networking",
      "agent-network",
      "account",
    ]);
  });

  it("drops Networking from accounts focused on Agent Network", () => {
    const focused = input({ agentNetworkOnly: true });
    expect(showNetworkingSection(focused)).toBe(false);
    expect(visibleSections(focused)).toEqual(["agent-network", "account"]);
  });

  it("drops Agent Network where the product is off", () => {
    const off = input({ agentNetworkEnabled: false });
    expect(showAgentNetworkSection(off)).toBe(false);
    expect(visibleSections(off)).toEqual(["networking", "account"]);
  });

  it("drops Agent Network for callers who can open none of its pages", () => {
    expect(visibleSections(input({ agentNetworkAccess: false }))).toEqual([
      "networking",
      "account",
    ]);
  });

  it("drops Networking for callers who can open none of its pages", () => {
    expect(visibleSections(input({ networkingAccess: false }))).toEqual([
      "agent-network",
      "account",
    ]);
  });

  it("keeps the account area when neither product shows", () => {
    expect(
      visibleSections(
        input({ agentNetworkEnabled: false, networkingAccess: false }),
      ),
    ).toEqual(["account"]);
  });

  it("does not let Agent Network grants bring back a product that is off", () => {
    expect(
      showAgentNetworkSection(
        input({ agentNetworkEnabled: false, agentNetworkAccess: true }),
      ),
    ).toBe(false);
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
    // Networking grants are not Agent Network grants.
    [{ policies: { read: true } }, false],
  ])("%j is %s", (permission, expected) => {
    expect(hasAgentNetworkGrant(permission)).toBe(expected);
  });
});

describe("hasNetworkingAccess", () => {
  it.each([
    [undefined, false],
    [{}, false],
    [{ "agent_network.providers": { read: true } }, false],
    [{ users: { read: true }, settings: { read: true } }, false],
    // Groups sit at the top for both products, not in Networking.
    [{ groups: { read: true } }, false],
    [{ policies: { read: true } }, true],
    [{ networks: { read: true } }, true],
    [{ routes: { read: true } }, true],
    [{ services: { read: true } }, true],
    [{ dns: { read: true } }, true],
    [{ nameservers: { read: true } }, true],
    [{ events: { read: true } }, true],
  ])("%j is %s", (permission, expected) => {
    expect(hasNetworkingAccess(permission)).toBe(expected);
  });
});

describe("agentNetworkPageAccess", () => {
  const none = {
    insights: false,
    usage: false,
    connect: false,
    providers: false,
    policies: false,
    configuration: false,
  };

  it("shows nothing without a grant or an own setup", () => {
    expect(
      agentNetworkPageAccess({ configured: false, insights: true }),
    ).toEqual(none);
  });

  it("gives a configured caller Connect Agent and their own Usage & Logs", () => {
    expect(
      agentNetworkPageAccess({ configured: true, insights: true }),
    ).toEqual({ ...none, connect: true, usage: true });
  });

  it("gives every page to a caller holding every grant", () => {
    const permission = {
      "agent_network.providers": { read: true },
      "agent_network.policies": { read: true },
      "agent_network.usage": { read: true },
      "agent_network.logs": { read: true },
      "agent_network.settings": { read: true },
    };
    expect(
      agentNetworkPageAccess({ permission, configured: false, insights: true }),
    ).toEqual({
      insights: true,
      usage: true,
      connect: true,
      providers: true,
      policies: true,
      configuration: true,
    });
  });

  it("gives a usage viewer Insights, Usage & Logs and Connect Agent", () => {
    expect(
      agentNetworkPageAccess({
        permission: { "agent_network.usage": { read: true } },
        configured: false,
        insights: true,
      }),
    ).toEqual({ ...none, insights: true, usage: true, connect: true });
  });

  it("hides Insights while the placeholders are switched off", () => {
    expect(
      agentNetworkPageAccess({
        permission: { "agent_network.usage": { read: true } },
        configured: true,
        insights: false,
      }).insights,
    ).toBe(false);
  });

  it("keeps Insights account-wide: an own setup alone is not enough", () => {
    expect(
      agentNetworkPageAccess({ configured: true, insights: true }).insights,
    ).toBe(false);
  });
});

describe("section state", () => {
  it("treats a section that was never toggled as open", () => {
    expect(isSectionOpen(undefined, "networking")).toBe(true);
    expect(isSectionOpen({}, "agent-network")).toBe(true);
    expect(isSectionOpen({ networking: false }, "networking")).toBe(false);
  });

  it("remembers the choice per user", () => {
    const stored = setSectionOpen({}, "alice", "networking", false);
    expect(stored).toEqual({ alice: { networking: false } });
    const both = setSectionOpen(stored, "bob", "agent-network", false);
    expect(both).toEqual({
      alice: { networking: false },
      bob: { "agent-network": false },
    });
    expect(isSectionOpen(both.bob, "networking")).toBe(true);
  });

  it("keeps the user's other sections when one changes", () => {
    const stored = { alice: { networking: false, "agent-network": false } };
    expect(setSectionOpen(stored, "alice", "networking", true)).toEqual({
      alice: { networking: true, "agent-network": false },
    });
  });

  it("opens the sections of the current page", () => {
    const stored = { alice: { networking: false, account: false } };
    expect(openSections(stored, "alice", ["networking", "account"])).toEqual({
      alice: { networking: true, account: true },
    });
  });

  it("returns the same state when those sections are open already", () => {
    const stored = { alice: { networking: true } };
    expect(openSections(stored, "alice", ["networking", "account"])).toBe(
      stored,
    );
    expect(openSections(stored, "alice", [])).toBe(stored);
  });

  it("leaves other users alone when opening sections", () => {
    const stored = {
      alice: { networking: false },
      bob: { networking: false },
    };
    expect(openSections(stored, "alice", ["networking"])).toEqual({
      alice: { networking: true },
      bob: { networking: false },
    });
  });
});
