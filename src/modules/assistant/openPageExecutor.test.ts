import { describe, expect, it } from "vitest";
import { navigateToPage, openPageExecutor } from "@/modules/assistant/openPageExecutor";

describe("navigateToPage", () => {
  it("builds a detail route from an id", () => {
    expect(navigateToPage({ page: "peer", id: "p1" })).toEqual({
      href: "/peer?id=p1",
    });
  });

  it("refuses a page it doesn't know", () => {
    expect(navigateToPage({ page: "billing" })).toHaveProperty("error");
  });

  it("refuses a detail page with no id", () => {
    expect(navigateToPage({ page: "peer" })).toHaveProperty("error");
  });

  it("encodes the id into the route", () => {
    expect(navigateToPage({ page: "peer", id: "a b" })).toEqual({
      href: "/peer?id=a%20b",
    });
  });

  it("opens the clusters tab, which is where a provider actually starts", () => {
    // A provider cannot be saved until a cluster exists, so this is the route
    // the assistant sends people to when it refuses to open the provider
    // dialog. It was the one step it could only describe in words.
    expect(
      navigateToPage({ page: "agent_network_configuration", tab: "clusters" }),
    ).toEqual({ href: "/agent-network/configuration?tab=clusters" });
  });

  it("reaches the rest of the Agent Network section", () => {
    expect(navigateToPage({ page: "agent_network_providers" })).toEqual({
      href: "/agent-network/providers",
    });
    expect(navigateToPage({ page: "agent_network_policies" })).toEqual({
      href: "/agent-network/policies",
    });
    expect(navigateToPage({ page: "agent_network_usage" })).toEqual({
      href: "/agent-network/usage",
    });
  });

  it("lands on the configuration page even with no tab", () => {
    // The page picks its own first tab, so a bare navigation still arrives
    // somewhere useful rather than being refused.
    expect(navigateToPage({ page: "agent_network_configuration" })).toEqual({
      href: "/agent-network/configuration",
    });
  });

  it("builds plain and tabbed routes", () => {
    expect(navigateToPage({ page: "dns" })).toEqual({
      href: "/dns/nameservers",
    });
    expect(navigateToPage({ page: "settings", tab: "general" })).toEqual({
      href: "/settings?tab=general",
    });
    expect(navigateToPage({ page: "settings" })).toEqual({
      href: "/settings",
    });
  });
});

describe("openPageExecutor", () => {
  const ctx = (pushed: string[]) => ({
    navigate: (href: string) => pushed.push(href),
    onControlCenterPage: () => false,
    setStatus: () => {},
  });

  it("pushes the route and reports it", async () => {
    const pushed: string[] = [];
    const outcome = await openPageExecutor({ page: "peers" }, ctx(pushed));
    expect(outcome).toEqual({ ok: true, content: "Navigated to /peers." });
    expect(pushed).toEqual(["/peers"]);
  });

  it("fails without navigating on an unknown page", async () => {
    const pushed: string[] = [];
    const outcome = await openPageExecutor({ page: "billing" }, ctx(pushed));
    expect(outcome.ok).toBe(false);
    expect(pushed).toEqual([]);
  });
});
