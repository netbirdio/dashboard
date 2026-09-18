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
