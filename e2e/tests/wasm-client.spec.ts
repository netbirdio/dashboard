import { readFileSync } from "fs";
import { join } from "path";
import type { Peer } from "../../src/interfaces/Peer";
import { apiDelete, apiGet } from "../helpers/api";
import { expect, test } from "../helpers/fixtures";

/**
 * Guards the pinned default WASM client, which is what a version bump changes:
 * the artifact must instantiate, and the dashboard's own remote-access flow
 * must still bring it online against management. The tunnel itself is not
 * exercised; deeper flows live in the client end-to-end suites.
 */

/** The wasm path pinned in config.ts, the single source the bump rewrites. */
const pinnedWasmPath = (): string => {
  const configSource = readFileSync(
    join(__dirname, "../../src/utils/config.ts"),
    "utf8",
  );
  const pinned = configSource.match(
    /https:\/\/pkgs\.netbird\.io\/wasm\/client\/v[0-9.]+/,
  );
  expect(pinned, "config.ts should pin a default wasm path").not.toBeNull();
  return pinned![0];
};

test.describe.serial("WASM client @wasm", () => {
  test("the pinned WASM client instantiates", async ({
    dashboardAsOwner: page,
  }) => {
    const result = await page.evaluate(async (url) => {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/wasm_exec.js";
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("wasm_exec.js failed to load"));
        document.head.appendChild(script);
      });

      const go = new (window as any).Go();
      const wasmModule = await WebAssembly.instantiateStreaming(
        fetch(url),
        go.importObject,
      );
      void go.run(wasmModule.instance);

      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        if (typeof (window as any).NetBirdClient === "function") {
          return "ok";
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return "NetBirdClient never appeared";
    }, pinnedWasmPath());

    expect(result).toBe("ok");
  });

  test("the remote-access flow brings the pinned WASM client online", async ({
    dashboardAsOwner: page,
  }) => {
    test.setTimeout(180_000);

    // The SSH page needs a peer to target; the environment always has peers
    // once its clusters are online. The SSH session itself will fail against
    // it, which is fine: the flow under test ends when the client is online.
    const peers = await apiGet<Peer[]>(page, "/peers");
    expect(
      peers.length,
      "the environment should have a peer to target",
    ).toBeGreaterThan(0);
    const before = new Set(peers.map((p) => p.id));

    // Mounting the page runs the dashboard's own chain: load the pinned wasm,
    // generate a key, register temporary access, start the client.
    await page.goto(`/peer/ssh?id=${peers[0].id}&user=root&port=22022`);

    // Management's view proves the round trip: the flow's ephemeral peer shows
    // up connected. Polled via the API because the connected flag is
    // management state, not a page response.
    let created: Peer | undefined;
    try {
      for (let attempt = 0; attempt < 45 && !created?.connected; attempt++) {
        await page.waitForTimeout(2_000);
        const all = await apiGet<Peer[]>(page, "/peers");
        created = all.find(
          (p) => !before.has(p.id) && p.name.endsWith("browser-client"),
        );
      }
      expect(
        created,
        "the flow should register a browser client peer",
      ).toBeTruthy();
      expect(
        created!.connected,
        "the browser client peer should be connected",
      ).toBe(true);
    } finally {
      // Best-effort: a throw here would mask the failure under test, and the
      // ephemeral peer must not outlive the test in the shared environment.
      try {
        await page.goto("/peers");
        if (created) await apiDelete(page, `/peers/${created.id}`);
      } catch {
        // The assertion that failed is the story; a cleanup miss is not.
      }
    }
  });
});
