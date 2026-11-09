import { expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import {
  deleteGroupsByPrefix,
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
import { routeMockPeer } from "../helpers/mock-peer";

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

  test("Full flow: a registering peer upgrades a Server placeholder", async ({
    dashboardAsOwner: page,
  }) => {
    const host = "cc-install-" + generateRandomName();
    const peers = await routeMockPeer(page);
    try {
      // getApiContext's first call navigates to /team/users, which would drop the draft.
      await listPeers(page);
      await openControlCenter(page);

      await enterDraft(page);
      await createViaCanvasMenu(page, "new-server");
      const placeholder = canvasNode(page, "peer-");
      await expect(placeholder).toHaveCount(1);

      await placeholder.hover();
      await page.getByTestId("cc-peer-install").click({ force: true });
      await expect(page.getByTestId("setup-netbird-modal")).toBeVisible();

      const keyResponse = page.waitForResponse(
        (r) =>
          r.url().includes("/api/setup-keys") &&
          r.request().method() === "POST",
      );
      await page.getByTestId("setup-generate-key").click();
      const key: { id: string; auto_groups: string[] } = await (
        await keyResponse
      ).json();
      // The key binds the placeholder's throwaway group; that group is what
      // the registering peer lands in and what the upgrade matches on.
      expect(key.auto_groups).toHaveLength(1);
      const boundGroupId = key.auto_groups[0];
      await page.keyboard.press("Escape");

      // Once the peer is matched, the key and group are torn down for real.
      const keyDeleted = page.waitForResponse(
        (r) =>
          r.url().endsWith(`/api/setup-keys/${key.id}`) &&
          r.request().method() === "DELETE",
      );
      // Resolves on the app's own /peers poll while an install is waiting.
      const peer = await peers.register(host, [
        { id: boundGroupId, name: "Server (Draft)" },
      ]);

      await expect(canvasNode(page, `peer-${peer.id}`)).toHaveCount(1);
      await expect(page.getByTestId("cc-peer-install")).toBeHidden();
      expect((await keyDeleted).ok()).toBe(true);
    } finally {
      await peers.dispose();
      await deleteSetupKeysByPrefix(page, "Draft Server");
      await deleteGroupsByPrefix(page, "Server (Draft)");
    }
  });
});
