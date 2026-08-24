import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ASSISTANT_TOOLS } from "@/modules/assistant/utils/tools";

const SERVER_TOOLS_DIR = join("assistant", "src", "agent", "tools");

// Tools the server executes itself and never hands back to the browser, so the
// dashboard has nothing to fulfil and no label to show.
const SERVER_ONLY = new Set(["load_skill"]);

// Mirrors isToolFile() in assistant/src/agent/tools/registry.ts. Kept as a copy
// because importing that module boots every tool (and the whole AI SDK) inside
// jsdom; the anchor assertions below catch it drifting out of sync.
function isToolFile(name: string): boolean {
  if (!name.endsWith(".ts") || name.endsWith(".d.ts")) return false;
  if (name === "registry.ts" || name.startsWith("_")) return false;
  return !/\.(test|spec)\.ts$/.test(name);
}

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, SERVER_TOOLS_DIR))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no ancestor of this test contains ${SERVER_TOOLS_DIR}`);
    dir = parent;
  }
  return dir;
}

function serverToolNames(): Set<string> {
  const dir = join(repoRoot(), SERVER_TOOLS_DIR);
  return new Set(
    readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && isToolFile(e.name))
      .map((e) => e.name.replace(/\.ts$/, "")),
  );
}

function missing(from: Set<string>, against: Set<string>): string[] {
  return [...from].filter((name) => !against.has(name)).sort();
}

describe("server and dashboard tool registries", () => {
  const server = serverToolNames();
  const dashboard = new Set(Object.keys(ASSISTANT_TOOLS));

  it("discovers the server's tool files", () => {
    expect(server.size).toBeGreaterThan(0);
    // Anchors: one management read and one control-center move. If the server's
    // exclusion filter drifts, discovery goes empty or nameless rather than
    // agreeing with the dashboard by accident.
    expect([...server]).toEqual(expect.arrayContaining(["list_peers", "cc_add"]));
  });

  it("has a dashboard entry for every tool the model can call", () => {
    const unfulfilled = missing(server, dashboard).filter((name) => !SERVER_ONLY.has(name));
    expect(
      unfulfilled,
      `server tools with no dashboard entry (add them to ASSISTANT_TOOLS, or to SERVER_ONLY if the server executes them): ${unfulfilled.join(", ")}`,
    ).toEqual([]);
  });

  it("has no dashboard entry without a server tool", () => {
    const unreachable = missing(dashboard, server);
    expect(
      unreachable,
      `dashboard tools the model can never call — no ${SERVER_TOOLS_DIR}/<name>.ts: ${unreachable.join(", ")}`,
    ).toEqual([]);
  });

  it("keeps the server-only allowlist honest", () => {
    const stale = [...SERVER_ONLY].filter((name) => !server.has(name) || dashboard.has(name)).sort();
    expect(stale, `SERVER_ONLY entries that are no longer server-only: ${stale.join(", ")}`).toEqual(
      [],
    );
  });
});
