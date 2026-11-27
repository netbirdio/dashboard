import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { change, newest, wasmVersion } from "./wasm-client-version.mjs";

// netbird's tags with a newer line released and an older one still maintained.
const TAGS = ["v0.81.4", "v0.81.5", "v0.82.0-rc.1", "v0.82.0"];

const config = (version) =>
  `wasmPath:\n  configJson?.wasmPath || "https://pkgs.netbird.io/wasm/client/${version}",\n`;

describe("newest", () => {
  it("bumps to the newest release", () => {
    expect(newest("v0.82.0", TAGS).bump).toBe(true);
  });

  it("bumps to a patch on the newest line", () => {
    expect(newest("v0.82.1", [...TAGS, "v0.82.1"]).bump).toBe(true);
  });

  it("skips a patch on an older line", () => {
    const d = newest("v0.81.6", [...TAGS, "v0.81.6"]);
    expect(d.bump).toBe(false);
    expect(d.reason).toMatch(/older than v0\.82\.0/);
  });

  it("is not held back by its own release candidate", () => {
    expect(newest("v0.82.0", ["v0.82.0-rc.1", "v0.82.0"]).bump).toBe(true);
  });

  it("is not held back by a newer prerelease", () => {
    expect(newest("v0.82.0", [...TAGS, "v0.83.0-rc.1"]).bump).toBe(true);
  });

  it("orders versions numerically", () => {
    expect(newest("v0.9.0", ["v0.9.0", "v0.10.0"]).bump).toBe(false);
    expect(newest("v0.82.10", ["v0.82.9", "v0.82.10"]).bump).toBe(true);
  });

  it("refuses a tag missing from the list", () => {
    expect(() => newest("v0.83.0", TAGS)).toThrow(/broken tag list/);
    expect(() => newest("v0.83.0", [])).toThrow(/broken tag list/);
  });

  it("refuses a prerelease tag", () => {
    expect(() => newest("v0.82.0-rc.1", TAGS)).toThrow(/not a stable/);
  });
});

describe("wasmVersion", () => {
  it("reads the release from the default URL", () => {
    expect(wasmVersion(config("v0.82.0"))).toBe("v0.82.0");
  });

  it("returns null when there is no URL", () => {
    expect(wasmVersion("export default {};\n")).toBeNull();
  });

  it("refuses more than one URL", () => {
    expect(() => wasmVersion(config("v0.81.5") + config("v0.82.0"))).toThrow(/expected one/);
  });

  it("reads a prerelease suffix as part of the version", () => {
    expect(wasmVersion(config("v0.82.0-rc.1"))).toBe("v0.82.0-rc.1");
  });

  it("refuses a URL that names no version", () => {
    expect(() => wasmVersion(config("latest"))).toThrow(/not a vMAJOR/);
  });
});

describe("change", () => {
  it("allows moving forward", () => {
    expect(change(config("v0.81.5"), config("v0.82.0")).ok).toBe(true);
  });

  it("allows leaving it alone", () => {
    expect(change(config("v0.82.0"), config("v0.82.0")).ok).toBe(true);
  });

  it("blocks moving it back, as #876 did", () => {
    const d = change(config("v0.81.5"), config("v0.81.3"));
    expect(d.ok).toBe(false);
    expect(d.reason).toMatch(/from v0\.81\.5 to v0\.81\.3/);
  });

  it("allows a first default when the base has none", () => {
    expect(change("export default {};\n", config("v0.82.0")).ok).toBe(true);
  });

  it("blocks pointing the default at a prerelease, even of the same version", () => {
    const d = change(config("v0.82.0"), config("v0.82.0-rc.1"));
    expect(d.ok).toBe(false);
    expect(d.reason).toMatch(/prerelease, v0\.82\.0-rc\.1/);
  });

  it("allows moving from a release candidate to its release", () => {
    expect(change(config("v0.82.0-rc.1"), config("v0.82.0")).ok).toBe(true);
  });

  it("blocks moving from a release candidate to an older release", () => {
    expect(change(config("v0.82.0-rc.1"), config("v0.81.5")).ok).toBe(false);
  });

  it("refuses a pull request whose config names no client", () => {
    expect(() => change(config("v0.82.0"), "export default {};\n")).toThrow(/needs updating/);
  });
});

// bumpRewrite runs the sed expression bump-netbird.yml uses on a config whose
// default names baseVersion, and returns the version the result names.
const bumpRewrite = (baseVersion, tag) => {
  const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/bump-netbird.yml"),
    "utf8",
  );
  const found = workflow.match(/sed -i "(s\|[^"]+)" src\/utils\/config\.ts/);
  expect(found, "bump-netbird.yml should rewrite config.ts with sed").not.toBeNull();
  const rewritten = execFileSync("sed", ["-e", found[1].replace("${TAG}", tag)], {
    input: config(baseVersion),
    encoding: "utf8",
  });
  return wasmVersion(rewritten);
};

describe("the bump workflow's rewrite", () => {
  it("moves a release to the next one", () => {
    expect(bumpRewrite("v0.83.2", "v0.84.0")).toBe("v0.84.0");
  });

  it("replaces a release candidate with its release", () => {
    expect(bumpRewrite("v0.84.0-rc.1", "v0.84.0")).toBe("v0.84.0");
  });

  it("replaces a release candidate with a later release", () => {
    expect(bumpRewrite("v0.84.0-rc.1", "v0.84.1")).toBe("v0.84.1");
  });
});
