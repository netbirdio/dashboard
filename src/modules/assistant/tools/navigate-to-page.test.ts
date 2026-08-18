import { describe, expect, it } from "vitest";
import { navigateToPage } from "@/modules/assistant/tools/navigate-to-page";

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
