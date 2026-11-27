import { describe, expect, it } from "vitest";
import { rdpDestination } from "./ironrdp-wasm-bridge";

describe("rdpDestination", () => {
  it("leaves an IPv4 address untouched", () => {
    expect(rdpDestination("100.64.0.7", 3389)).toBe("100.64.0.7:3389");
  });

  it("leaves a hostname untouched", () => {
    expect(rdpDestination("peer.netbird.cloud", "3390")).toBe(
      "peer.netbird.cloud:3390",
    );
  });

  it("brackets an IPv6 literal so the port stays distinguishable", () => {
    expect(rdpDestination("fd00::1234", 3389)).toBe("[fd00::1234]:3389");
  });
});
