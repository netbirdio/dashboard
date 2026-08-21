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
    // Placeholders match their machine by the hidden bound group, not a --hostname.
    await expect(modal).not.toContainText("--hostname");

    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });

  test("Review & Deploy opens the first change even when it's a Server install step", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    // A lone Server placeholder's install-peer change sorts to the top of the list.
    await createViaCanvasMenu(page, "new-server");
    await expect(canvasNode(page, "peer-")).toHaveCount(1);

    await reviewButton(page).click();
    const item = page.getByTestId("cc-change-install-peer");
    await expect(item).toBeVisible();
    await expect(item).toHaveAttribute("data-state", "open");
  });

  test("Full flow: a docker peer installs (upgrades) a Server placeholder", async ({
    dashboardAsOwner: page,
  }) => {
    test.setTimeout(180_000);
    const host = "cc-install-" + generateRandomName();
    try {
      // getApiContext's first call navigates to /team/users, which would drop the draft.
      await listPeers(page);
      await openControlCenter(page);

      await enterDraft(page);
      await createViaCanvasMenu(page, "new-server");
      const placeholder = canvasNode(page, "peer-");
      await expect(placeholder).toHaveCount(1);

      // The plaintext key is only in the POST response, so capture it there.
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

      // The peer registers into the key's bound group.
      await runDockerPeerWithKey(page, host, key);

      // Revalidate via SWR's revalidateOnFocus; focus is throttled, so dispatch per poll.
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

      expect((await listPeers(page)).some((p) => p.name === host)).toBe(true);
    } finally {
      removeDockerContainer(host);
      await deletePeersByPrefix(page, host);
      await deleteSetupKeysByPrefix(page, "Draft Server");
      await deleteGroupsByPrefix(page, "Server (Draft)");
    }
  });
});
