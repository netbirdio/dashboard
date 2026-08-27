import { readFileSync } from "fs";
import { join } from "path";
import { expect, test } from "../helpers/fixtures";

/**
 * Guards the pinned default WASM client, which is what a version bump changes.
 * The artifact must download and instantiate against the wasm_exec.js this
 * dashboard serves, and must publish the client entry point the remote-access
 * modules construct. That pairing is the part a bump breaks: a missing build,
 * a truncated upload, or a Go runtime newer than the checked-in loader.
 *
 * Bringing the client online needs signal, relay and a target peer, none of
 * which exist in this environment; the client end-to-end suites cover that.
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

test.describe("WASM client @wasm", () => {
  test("the pinned WASM client instantiates", async ({
    dashboardAsOwner: page,
  }) => {
    // The client is a ~60MB module fetched from the package host, so downloading
    // and compiling it does not fit the default per-test budget.
    test.setTimeout(180_000);

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

      // The Go runtime publishes its exports partway through startup, so the
      // constructor appears some time after go.run() returns. This matches the
      // deadline the dashboard applies to the same wait, so an artifact this
      // test accepts is one the dashboard can also load.
      const deadline = Date.now() + 10_000;
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
});
