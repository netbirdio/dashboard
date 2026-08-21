import type { Page } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";
import type { Peer } from "../../src/interfaces/Peer";
import { generateKeypair } from "../../src/utils/wireguard";
import { apiDelete, apiGet, apiPost, managementOrigin } from "../helpers/api";
import { expect, test } from "../helpers/fixtures";
import { generateRandomName } from "../helpers/utils";

/**
 * Guards the pinned default WASM client, which is what a version bump changes:
 * the artifact must instantiate, and the client it exports must still speak to
 * management with the options this dashboard passes. The tunnel itself is not
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

/** Loads and boots the pinned module until it exports its constructor. */
const bootWasmClient = async (page: Page, wasmUrl: string): Promise<string> =>
  page.evaluate(async (url) => {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/wasm_exec.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("wasm_exec.js failed to load"));
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
  }, wasmUrl);

test.describe.serial("WASM client @wasm", () => {
  test("the pinned WASM client instantiates", async ({
    dashboardAsOwner: page,
  }) => {
    expect(await bootWasmClient(page, pinnedWasmPath())).toBe("ok");
  });

  test("the pinned WASM client connects to management", async ({
    dashboardAsOwner: page,
  }) => {
    test.setTimeout(180_000);

    // Temporary access needs something to be granted against; the environment
    // always has peers once its clusters are online.
    const peers = await apiGet<Peer[]>(page, "/peers");
    expect(
      peers.length,
      "the environment should have a peer to grant against",
    ).toBeGreaterThan(0);

    const keypair = generateKeypair();
    const name = generateRandomName("e2e-wasm-");
    await apiPost(page, `/peers/${peers[0].id}/temporary-access`, {
      name,
      wg_pub_key: keypair.publicKey,
      rules: ["tcp/22022"],
    });

    let created: Peer | undefined;
    try {
      expect(await bootWasmClient(page, pinnedWasmPath())).toBe("ok");

      const mgmt = await managementOrigin(page);
      const started = await page.evaluate(
        async ({ privateKey, managementURL, deviceName }) => {
          const client = await (window as any).NetBirdClient({
            privateKey,
            managementURL,
            deviceName,
          });
          (window as any).__e2eWasmClient = client;
          try {
            await client.start();
            return "ok";
          } catch (error) {
            return String(error);
          }
        },
        {
          privateKey: keypair.privateKey,
          managementURL: mgmt,
          deviceName: name,
        },
      );
      expect(started, "the client should log in and sync").toBe("ok");

      // Management's view proves the login round trip: the registered peer
      // shows up connected under the name it was registered with. Polled via
      // the API because the connected flag is management state, not a page
      // response.
      for (let attempt = 0; attempt < 30 && !created?.connected; attempt++) {
        await page.waitForTimeout(2_000);
        const all = await apiGet<Peer[]>(page, "/peers");
        created = all.find((p) => p.name === name);
      }
      expect(created, "the registered peer should appear").toBeTruthy();
      expect(
        created!.connected,
        "the registered peer should be connected",
      ).toBe(true);
    } finally {
      // Best-effort: a throw here would mask the failure under test, and the
      // registered peer must not outlive the test in the shared environment.
      try {
        await page.evaluate(async () => {
          await (window as any).__e2eWasmClient?.stop?.();
        });
        const leftover =
          created ??
          (await apiGet<Peer[]>(page, "/peers")).find((p) => p.name === name);
        if (leftover) await apiDelete(page, `/peers/${leftover.id}`);
      } catch {
        // The assertion that failed is the story; a cleanup miss is not.
      }
    }
  });
});
