import { describe, expect, it } from "vitest";
import {
  agentNetworkHome,
  canonicalSearch,
  crumbProduct,
  hasAgentNetworkGrant,
  parseProduct,
  productHomes,
  productHref,
  resolveProduct,
  routeOwner,
  showProductSwitch,
} from "@/modules/agent-network/product";

describe("routeOwner", () => {
  it.each([
    // Agent Network pages, Insights included.
    ["/agent-network", "agent-network"],
    ["/agent-network/", "agent-network"],
    ["/agent-network/providers", "agent-network"],
    ["/agent-network/policies", "agent-network"],
    ["/agent-network/insights/models", "agent-network"],
    // Pages only Networking has.
    ["/access-control", "networking"],
    ["/posture-checks", "networking"],
    ["/networks", "networking"],
    ["/network", "networking"],
    ["/network-routes", "networking"],
    ["/reverse-proxy/services", "networking"],
    ["/dns/zones", "networking"],
    ["/events/traffic", "networking"],
    ["/events/proxy", "networking"],
    // Pages both products show: the shared objects and the account area.
    ["/control-center", "shared"],
    ["/peers", "shared"],
    ["/peer", "shared"],
    ["/groups", "shared"],
    ["/group", "shared"],
    ["/team/users", "shared"],
    ["/team/service-users", "shared"],
    ["/events/audit", "shared"],
    ["/settings", "shared"],
    ["/integrations", "shared"],
    ["/setup-keys", "shared"],
    // Look-alike paths are not the sections they resemble.
    ["/agent-networks", "shared"],
    ["/agent-network-foo", "shared"],
    ["/dnssec", "shared"],
    ["/events", "shared"],
    ["/", "shared"],
    ["", "shared"],
    [null, "shared"],
    [undefined, "shared"],
  ])("%s belongs to %s", (path, owner) => {
    expect(routeOwner(path)).toBe(owner);
  });
});

describe("parseProduct", () => {
  it("accepts the two products and nothing else", () => {
    expect(parseProduct("networking")).toBe("networking");
    expect(parseProduct("agent-network")).toBe("agent-network");
    expect(parseProduct("Agent-Network")).toBeUndefined();
    expect(parseProduct("billing")).toBeUndefined();
    expect(parseProduct("")).toBeUndefined();
    expect(parseProduct(null)).toBeUndefined();
  });
});

describe("resolveProduct", () => {
  const both = { switchable: true, only: false };

  it("follows the route on the pages of one product, whatever the URL says", () => {
    expect(
      resolveProduct({ ...both, path: "/agent-network/usage", param: "networking" }),
    ).toBe("agent-network");
    expect(
      resolveProduct({
        ...both,
        path: "/dns/zones",
        param: "agent-network",
        remembered: "agent-network",
      }),
    ).toBe("networking");
  });

  it("takes a shared page's product from the URL first", () => {
    expect(
      resolveProduct({
        ...both,
        path: "/peers",
        param: "agent-network",
        remembered: "networking",
      }),
    ).toBe("agent-network");
    expect(
      resolveProduct({
        ...both,
        path: "/team/users",
        param: "networking",
        remembered: "agent-network",
      }),
    ).toBe("networking");
  });

  it("falls back to the product the user was last in, then Networking", () => {
    expect(
      resolveProduct({ ...both, path: "/peers", remembered: "agent-network" }),
    ).toBe("agent-network");
    expect(
      resolveProduct({
        ...both,
        path: "/peers",
        param: "bogus",
        remembered: "agent-network",
      }),
    ).toBe("agent-network");
    expect(resolveProduct({ ...both, path: "/peers" })).toBe("networking");
  });

  it("is always Agent Network on an Agent Network only dashboard", () => {
    for (const path of ["/peers", "/dns", "/agent-network/providers"]) {
      expect(
        resolveProduct({
          path,
          param: "networking",
          remembered: "networking",
          switchable: false,
          only: true,
        }),
      ).toBe("agent-network");
    }
  });

  it("is always Networking without the switch", () => {
    for (const path of ["/peers", "/agent-network/providers"]) {
      expect(
        resolveProduct({
          path,
          param: "agent-network",
          remembered: "agent-network",
          switchable: false,
          only: false,
        }),
      ).toBe("networking");
    }
  });
});

describe("productHref", () => {
  it("names the product on links to shared pages", () => {
    expect(productHref("/peers", "agent-network")).toBe(
      "/peers?product=agent-network",
    );
    expect(productHref("/team/users", "networking")).toBe(
      "/team/users?product=networking",
    );
  });

  it("keeps the rest of the query and the hash", () => {
    expect(productHref("/peers?kind=users", "agent-network")).toBe(
      "/peers?kind=users&product=agent-network",
    );
    expect(productHref("/settings?tab=groups#jwt", "networking")).toBe(
      "/settings?tab=groups&product=networking#jwt",
    );
    expect(
      productHref("/peers?product=networking", "agent-network"),
    ).toBe("/peers?product=agent-network");
  });

  it("leaves the pages of one product and external links alone", () => {
    expect(productHref("/agent-network/providers", "networking")).toBe(
      "/agent-network/providers",
    );
    expect(productHref("/dns/zones", "agent-network")).toBe("/dns/zones");
    expect(productHref("https://docs.netbird.io/", "networking")).toBe(
      "https://docs.netbird.io/",
    );
  });
});

describe("canonicalSearch", () => {
  it("adds the product to a shared page that doesn't name it", () => {
    expect(canonicalSearch("/peer", "id=p1", "agent-network")).toBe(
      "id=p1&product=agent-network",
    );
    expect(canonicalSearch("/peers", "", "networking")).toBe(
      "product=networking",
    );
  });

  it("corrects a shared page that names another product", () => {
    expect(
      canonicalSearch("/peers", "product=networking", "agent-network"),
    ).toBe("product=agent-network");
  });

  it("leaves a shared page that already names the product", () => {
    expect(
      canonicalSearch("/peer", "id=p1&product=agent-network", "agent-network"),
    ).toBeUndefined();
  });

  it("drops a stray product from the pages of one product", () => {
    expect(
      canonicalSearch("/agent-network/usage", "product=networking&tab=logs", "agent-network"),
    ).toBe("tab=logs");
    expect(canonicalSearch("/dns", "product=networking", "networking")).toBe("");
    expect(canonicalSearch("/dns", "", "networking")).toBeUndefined();
  });
});

describe("crumbProduct", () => {
  const both = { switchable: true, only: false };
  const only = { switchable: false, only: true };
  const single = { switchable: false, only: false };

  it("leaves Agent Network pages to name the product themselves", () => {
    expect(
      crumbProduct({ ...both, path: "/agent-network/providers", product: "agent-network" }),
    ).toBeUndefined();
    expect(
      crumbProduct({ ...only, path: "/agent-network/providers", product: "agent-network" }),
    ).toBeUndefined();
  });

  it("names Networking on its pages only when there is a second product", () => {
    expect(
      crumbProduct({ ...both, path: "/dns", product: "networking" }),
    ).toBe("networking");
    expect(
      crumbProduct({ ...single, path: "/dns", product: "networking" }),
    ).toBeUndefined();
    expect(
      crumbProduct({ ...only, path: "/dns", product: "agent-network" }),
    ).toBeUndefined();
  });

  it("names the current product on shared pages whenever Agent Network is there", () => {
    expect(
      crumbProduct({ ...both, path: "/peers", product: "agent-network" }),
    ).toBe("agent-network");
    expect(
      crumbProduct({ ...both, path: "/peers", product: "networking" }),
    ).toBe("networking");
    expect(
      crumbProduct({ ...only, path: "/team/users", product: "agent-network" }),
    ).toBe("agent-network");
    expect(
      crumbProduct({ ...single, path: "/peers", product: "networking" }),
    ).toBeUndefined();
  });
});

describe("hasAgentNetworkGrant", () => {
  it("is false without any agent_network read grant", () => {
    expect(hasAgentNetworkGrant(undefined)).toBe(false);
    expect(hasAgentNetworkGrant({})).toBe(false);
    expect(
      hasAgentNetworkGrant({ "agent_network.providers": { read: false } }),
    ).toBe(false);
  });

  it.each([
    "agent_network.providers",
    "agent_network.policies",
    "agent_network.usage",
    "agent_network.logs",
    "agent_network.settings",
  ] as const)("is true with %s read", (key) => {
    expect(hasAgentNetworkGrant({ [key]: { read: true } })).toBe(true);
  });
});

describe("homes", () => {
  it("lands on Providers, or Connect Agent without the providers grant", () => {
    expect(
      agentNetworkHome({ "agent_network.providers": { read: true } }),
    ).toBe("/agent-network/providers");
    expect(agentNetworkHome({ "agent_network.usage": { read: true } })).toBe(
      "/agent-network/connect",
    );
    expect(agentNetworkHome(undefined)).toBe("/agent-network/connect");
  });

  it("lands Networking on Peers in Networking", () => {
    expect(productHomes(undefined).networking).toBe(
      "/peers?product=networking",
    );
  });
});

describe("showProductSwitch", () => {
  it("shows when Agent Network is enabled, not the only product, and reachable", () => {
    expect(
      showProductSwitch({ enabled: true, only: false, hasAccess: true }),
    ).toBe(true);
  });

  it.each([
    { enabled: false, only: false, hasAccess: true },
    { enabled: true, only: true, hasAccess: true },
    { enabled: true, only: false, hasAccess: false },
    { enabled: false, only: false, hasAccess: false },
  ])("hides for %o", (input) => {
    expect(showProductSwitch(input)).toBe(false);
  });
});
