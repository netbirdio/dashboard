import { readFileSync } from "fs";
import { join } from "path";
import type { Peer } from "../../src/interfaces/Peer";
import type { ReverseProxy } from "../../src/interfaces/ReverseProxy";
import { apiDelete, apiGet, apiPost, deleteServicesByPrefix } from "../helpers/api";
import { expect, test } from "../helpers/fixtures";
import { CUSTOM_PORTS_DOMAIN } from "../helpers/reverse-proxy-l4";
import { generateRandomName } from "../helpers/utils";

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
    test.setTimeout(300_000);

    // The SSH page needs a peer to target. A fresh account has none, so one is
    // minted the way the environment supports: exposing a service makes a proxy
    // register an embedded peer for the account. The SSH session itself will
    // fail against it, which is fine: the flow under test ends when the
    // browser client is online.
    await deleteServicesByPrefix(page, "wasm-e2e-");
    const serviceName = generateRandomName("wasm-e2e-");
    await apiPost<ReverseProxy>(page, "/reverse-proxies/services", {
      name: serviceName,
      domain: `${serviceName}.${CUSTOM_PORTS_DOMAIN}`,
      enabled: true,
      targets: [
        {
          target_type: "host",
          protocol: "http",
          host: "10.99.99.40",
          port: 80,
          enabled: true,
        },
      ],
    });

    let target: Peer | undefined;
    for (let attempt = 0; attempt < 45 && !target; attempt++) {
      await page.waitForTimeout(2_000);
      const all = await apiGet<Peer[]>(page, "/peers");
      target = all.find((p) => p.name.startsWith("proxy-"));
    }
    expect(target, "exposing a service should register a proxy peer").toBeTruthy();

    const before = new Set(
      (await apiGet<Peer[]>(page, "/peers")).map((p) => p.id),
    );

    // Mounting the page runs the dashboard's own chain: load the pinned wasm,
    // generate a key, register temporary access, start the client.
    await page.goto(`/peer/ssh?id=${target!.id}&user=root&port=22022`);

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
      // test's artifacts must not outlive it in the shared environment.
      try {
        await page.goto("/peers");
        if (created) await apiDelete(page, `/peers/${created.id}`);
        await deleteServicesByPrefix(page, "wasm-e2e-");
      } catch {
        // The assertion that failed is the story; a cleanup miss is not.
      }
    }
  });
});
