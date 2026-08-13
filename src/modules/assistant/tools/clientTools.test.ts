import { describe, expect, it } from "vitest";
import { pageHref, pageIdMismatch } from "./clientTools";

describe("pageHref", () => {
  it("builds a detail route from an id", () => {
    expect(pageHref({ page: "peer", id: "p1" })).toBe("/peer?id=p1");
  });

  it("refuses a page it doesn't know", () => {
    expect(pageHref({ page: "billing" })).toBeNull();
  });

  it("refuses a detail page with no id", () => {
    expect(pageHref({ page: "peer" })).toBeNull();
  });
});

describe("pageIdMismatch", () => {
  it("rejects a scalar token used as a peer id", () => {
    const message = pageIdMismatch({ page: "peer", id: "{DNS_1}" });
    expect(message).toContain("not a peer id");
    expect(message).toContain("{DNS_1}");
  });

  it("rejects a resource token of the wrong kind", () => {
    expect(pageIdMismatch({ page: "peer", id: "{GROUP_2}" })).toContain(
      "not a peer id",
    );
  });

  it("accepts the matching kind, with or without braces", () => {
    expect(pageIdMismatch({ page: "peer", id: "{PEER_3}" })).toBeNull();
    expect(pageIdMismatch({ page: "peer", id: "PEER_3" })).toBeNull();
  });

  it("leaves a real id alone", () => {
    expect(pageIdMismatch({ page: "peer", id: "d0lgs4vqvpnu4h5rf6k0" })).toBeNull();
  });

  it("ignores pages that take no id", () => {
    expect(pageIdMismatch({ page: "dns" })).toBeNull();
    expect(pageIdMismatch({ page: "settings", tab: "general" })).toBeNull();
  });
});
