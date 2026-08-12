import { describe, expect, it } from "vitest";
import { isNativeSSHSupported } from "./version";

describe("isNativeSSHSupported", () => {
  it.each([
    { version: "v0.59.9", shouldSupport: false },
    { version: "v0.59.10", shouldSupport: false },
    { version: "v0.59.11", shouldSupport: false },
    { version: "v0.60.0", shouldSupport: true },
    { version: "v0.60.1", shouldSupport: true },
    { version: "v0.61.0", shouldSupport: true },
    { version: "v1.0.0", shouldSupport: true },

    // Edge cases
    { version: "development", shouldSupport: true, desc: "development build" },
    { version: "0.60.0", shouldSupport: true, desc: "no v prefix" },
    { version: "0.59.11", shouldSupport: false, desc: "no v prefix" },
    { version: "v0.60.0-beta", shouldSupport: true, desc: "with suffix" },
    { version: "v0.60.0-rc1", shouldSupport: true, desc: "with rc suffix" },
    {
      version: "v0.59.9-beta",
      shouldSupport: false,
      desc: "old version with suffix",
    },
  ])("$version → $shouldSupport ($desc)", ({ version, shouldSupport }) => {
    expect(isNativeSSHSupported(version)).toBe(shouldSupport);
  });
});
