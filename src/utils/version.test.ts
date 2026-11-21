import { describe, expect, it } from "vitest";
import { compareVersions, isNewerVersion, usesStandardSSHPort } from "./version";

describe("usesStandardSSHPort", () => {
  it.each([
    { version: "v0.59.9", shouldSupport: false, desc: "below minimum" },
    { version: "v0.59.10", shouldSupport: false, desc: "below minimum" },
    { version: "v0.59.11", shouldSupport: false, desc: "below minimum" },
    { version: "v0.60.0", shouldSupport: true, desc: "exact minimum" },
    { version: "v0.60.1", shouldSupport: true, desc: "above minimum" },
    { version: "v0.61.0", shouldSupport: true, desc: "above minimum" },
    { version: "v1.0.0", shouldSupport: true, desc: "above minimum" },

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
    {
      version: "0.60.0+enterprise.1",
      shouldSupport: true,
      desc: "enterprise build",
    },
    {
      version: "0.59.9+enterprise.1",
      shouldSupport: false,
      desc: "old enterprise build",
    },
    {
      version: "0.76.3-31256681241",
      shouldSupport: true,
      desc: "CI build suffix",
    },
    {
      version: "dev-16f7e1e14",
      shouldSupport: true,
      desc: "commit-stamped mobile build",
    },
    { version: "", shouldSupport: true, desc: "unreported version" },
  ])("$version → $shouldSupport ($desc)", ({ version, shouldSupport }) => {
    expect(usesStandardSSHPort(version)).toBe(shouldSupport);
  });
});

describe("compareVersions (version >= minVersion)", () => {
  it.each([
    { version: "0.60.0", min: "0.60.0", expected: true, desc: "equal" },
    { version: "0.60.1", min: "0.60.0", expected: true, desc: "newer patch" },
    { version: "0.59.9", min: "0.60.0", expected: false, desc: "older patch" },
    // A build suffix is not a fourth release component.
    {
      version: "0.60.0-beta.1",
      min: "0.60.1",
      expected: false,
      desc: "pre-release vs newer patch",
    },
    {
      version: "0.60.0+enterprise.1",
      min: "0.60.1",
      expected: false,
      desc: "enterprise vs newer patch",
    },
    {
      version: "0.77.0+enterprise.1",
      min: "0.77.0",
      expected: true,
      desc: "enterprise build metadata ignored",
    },
  ])("$version >= $min → $expected ($desc)", ({ version, min, expected }) => {
    expect(compareVersions(version, min)).toBe(expected);
  });
});

describe("isNewerVersion (update available)", () => {
  it.each([
    {
      current: "0.77.0+enterprise.1",
      latest: "0.77.0",
      expected: false,
      desc: "enterprise build, same release",
    },
    {
      current: "0.77.0+enterprise.1",
      latest: "0.77.1",
      expected: true,
      desc: "enterprise build, newer patch",
    },
    {
      current: "0.77.0+enterprise.2",
      latest: "0.76.9",
      expected: false,
      desc: "enterprise build, older latest",
    },
    {
      current: "0.76.3-31256681241",
      latest: "0.76.3",
      expected: false,
      desc: "CI build suffix",
    },
    {
      current: "v2.91.0",
      latest: "2.91.0",
      expected: false,
      desc: "v prefix on one side",
    },
    {
      current: "development",
      latest: "0.77.0",
      expected: false,
      desc: "development build",
    },
    {
      current: "dev-16f7e1e14",
      latest: "0.77.0",
      expected: false,
      desc: "commit-stamped mobile build",
    },
    { current: "0.77.0", latest: "", expected: false, desc: "unknown latest" },
  ])("$current → $latest → $expected ($desc)", ({ current, latest, expected }) => {
    expect(isNewerVersion(current, latest)).toBe(expected);
  });
});
