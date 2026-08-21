import { readFileSync } from "fs";
import { join } from "path";
import { test, expect } from "../helpers/fixtures";

/**
 * Instantiates the pinned default WASM client. This is what guards a version
 * bump: the pinned URL must resolve and the module must compile, instantiate
 * and boot far enough to export its constructor. No management connection is
 * made, so this covers the artifact, not the tunnel.
 */
test.describe("WASM client @wasm", () => {
  test("the pinned WASM client instantiates", async ({
    dashboardAsOwner: page,
  }) => {
    const configSource = readFileSync(
      join(__dirname, "../../src/utils/config.ts"),
      "utf8",
    );
    const pinned = configSource.match(
      /https:\/\/pkgs\.netbird\.io\/wasm\/client\/v[0-9.]+/,
    );
    expect(pinned, "config.ts should pin a default wasm path").not.toBeNull();

    const result = await page.evaluate(async (wasmUrl) => {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/wasm_exec.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("wasm_exec.js failed to load"));
        document.head.appendChild(script);
      });

      const go = new (window as any).Go();
      const module = await WebAssembly.instantiateStreaming(
        fetch(wasmUrl),
        go.importObject,
      );
      void go.run(module.instance);

      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        if (typeof (window as any).NetBirdClient === "function") {
          return "ok";
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return "NetBirdClient never appeared";
    }, pinned![0]);

    expect(result).toBe("ok");
  });
});
