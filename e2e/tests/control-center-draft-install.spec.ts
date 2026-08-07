import { expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import {
  deleteGroupsByPrefix,
  deletePeersByPrefix,
  deleteSetupKeysByPrefix,
  listPeers,
} from "../helpers/api";
import { generateRandomName } from "../helpers/utils";
import {
  canvasNode,
  createViaCanvasMenu,
  enterDraft,
  openControlCenter,
  resetDraftState,
  reviewButton,
} from "../helpers/control-center";
import {
  removeDockerContainer,
  runDockerPeerWithKey,
} from "../helpers/docker-peer";

/**
 * Placeholder-peer install ENTRY point. A Server/Agent placeholder carries a
 * floating "Install" button that opens the "Install NetBird" setup modal
 * (which, when the user generates a key, binds a hidden auto-group so a
 * registering peer upgrades the placeholder in place).
 *
 * NOTE: the FULL upgrade flow (generate key → register a docker peer in the
 * auto-group → placeholder swaps to the real peer) is a much larger, fragile
 * orchestration; the entry-point test below is the deterministic core.
 */
test.describe.serial("Control Center Draft Install @control-center", () => {
  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test("A Server placeholder's Install button opens the setup modal", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await createViaCanvasMenu(page, "new-server");

    const placeholder = canvasNode(page, "peer-");
    await expect(placeholder).toHaveCount(1);

    await placeholder.hover();
    await page.getByTestId("cc-peer-install").click({ force: true });

    await expect(page.getByTestId("setup-netbird-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("setup-netbird-modal")).not.toBeVisible();
  });

  test("A Server install command omits --hostname (matched by its bound group)", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await createViaCanvasMenu(page, "new-server");
    const placeholder = canvasNode(page, "peer-");
    await expect(placeholder).toHaveCount(1);

    await placeholder.hover();
    await page.getByTestId("cc-peer-install").click({ force: true });

    const modal = page.getByTestId("setup-netbird-modal");
    await expect(modal).toBeVisible();
    // Server/Agent placeholders match their installed machine by the hidden
    // bound group now, so the install command no longer pins a --hostname
    // (which used to read `--hostname 'server'`).
    await expect(modal).not.toContainText("--hostname");

    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });

  test("Review & Deploy opens the first change even when it's a Server install step", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    // A lone Server placeholder is an install-peer change. It sorts to the
    // very top of the list, so it IS the first accordion.
    await createViaCanvasMenu(page, "new-server");
    await expect(canvasNode(page, "peer-")).toHaveCount(1);

    await reviewButton(page).click();
    const item = page.getByTestId("cc-change-install-peer");
    await expect(item).toBeVisible();
    // The regression: the first accordion must open by default, even though
    // it's an install-peer row (it used to be skipped, leaving nothing open).
    await expect(item).toHaveAttribute("data-state", "open");
  });

  test("Full flow: a docker peer installs (upgrades) a Server placeholder", async ({
    dashboardAsOwner: page,
  }) => {
    test.setTimeout(180_000);
    const host = "cc-install-" + generateRandomName();
    try {
      // Prime the API-token capture BEFORE entering draft: getApiContext
      // navigates the page to /team/users on its first call, which would blow
      // away the draft mid-test. After this, api helpers use page.request
      // (no navigation).
      await listPeers(page);
      // Priming navigated to /team/users — go back to the canvas before draft.
      await openControlCenter(page);

      await enterDraft(page);
      await createViaCanvasMenu(page, "new-server");
      const placeholder = canvasNode(page, "peer-");
      await expect(placeholder).toHaveCount(1);

      // Open Install. Generating the key creates a hidden "Server (Draft)"
      // bound group + a one-off key with that group as an auto-group. The
      // plaintext key is only in the POST response, so capture it there
      // (placeholder peers aren't persisted to the draft-canvas localStorage).
      await placeholder.hover();
      await page.getByTestId("cc-peer-install").click({ force: true });
      await expect(page.getByTestId("setup-netbird-modal")).toBeVisible();

      const keyResponse = page.waitForResponse(
        (r) =>
          r.url().includes("/api/setup-keys") &&
          r.request().method() === "POST",
        { timeout: 20_000 },
      );
      await page.getByTestId("setup-generate-key").click();
      const created = await (await keyResponse).json();
      const key: string = created.key;
      expect(key?.length ?? 0).toBeGreaterThan(0);
      await page.keyboard.press("Escape");

      // Register a real docker peer with that key → it lands in the bound group.
      await runDockerPeerWithKey(page, host, key);

      // Trigger a /peers revalidation WITHOUT leaving draft (SWR
      // revalidateOnFocus). The upgrade watcher then matches the registered
      // peer (by its bound group) and swaps the placeholder for the real peer
      // in place — the Install button disappears. Focus is throttled (~5s), so
      // dispatch it each poll iteration.
      await expect
        .poll(
          async () => {
            await page.evaluate(() => {
              window.dispatchEvent(new Event("focus"));
              document.dispatchEvent(new Event("visibilitychange"));
            });
            return !(await page
              .getByTestId("cc-peer-install")
              .isVisible()
              .catch(() => false));
          },
          { timeout: 90_000, intervals: [3000, 3000, 5000, 5000, 5000] },
        )
        .toBe(true);

      // The peer really exists in the account.
      expect((await listPeers(page)).some((p) => p.name === host)).toBe(true);
    } finally {
      removeDockerContainer(host);
      await deletePeersByPrefix(page, host);
      await deleteSetupKeysByPrefix(page, "Draft Server");
      await deleteGroupsByPrefix(page, "Server (Draft)");
    }
  });
});
