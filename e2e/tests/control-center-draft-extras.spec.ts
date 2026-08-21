import { expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import {
  canvasNode,
  createViaCanvasMenu,
  enterDraft,
  resetDraftState,
} from "../helpers/control-center";

/**
 * Draft-mode extras not covered by the matrix/connections specs: creating a
 * draft NETWORK frame via the canvas menu (+ its right-click frame actions),
 * and the Auto Arrange toolbar button.
 */
test.describe.serial("Control Center Draft Extras @control-center", () => {
  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test("New Network (canvas menu) adds a draft frame with its frame actions", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await createViaCanvasMenu(page, "new-network");

    const frame = canvasNode(page, "network-new-");
    await expect(frame).toHaveCount(1);

    // A draft network frame's right-click menu (draft-only Edit is present):
    // Edit · Add Resource · Add Resource Group · Add Routing Peer · Remove.
    await frame.click({ button: "right" });
    const menu = page.getByTestId("cc-node-context-menu");
    await expect(menu).toBeVisible();
    for (const action of [
      "edit",
      "add-resource",
      "add-resource-group",
      "add-routing-peer",
      "remove",
    ]) {
      await expect(menu.getByTestId(`cc-menu-${action}`)).toBeVisible();
    }
  });

  test("Auto Arrange repositions overlapping nodes", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);

    // Two groups created at the viewport centre land on top of each other.
    await page.locator(".react-flow__pane").click();
    await page.keyboard.press("Alt+4");
    await page.keyboard.press("Alt+4");
    const groups = canvasNode(page, "group-new-");
    await expect(groups).toHaveCount(2);

    // Auto Arrange lays the canvas out so they no longer share a position.
    await page.getByTestId("cc-toolbar-arrange").click();

    await expect
      .poll(async () => {
        const a = await groups.nth(0).boundingBox();
        const b = await groups.nth(1).boundingBox();
        if (!a || !b) return false;
        // Different position after arrange (allow a small epsilon).
        return Math.abs(a.x - b.x) > 5 || Math.abs(a.y - b.y) > 5;
      })
      .toBe(true);
  });

  test("Editing a draft network frame renames it on the canvas", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await createViaCanvasMenu(page, "new-network");
    const frame = canvasNode(page, "network-new-");
    await expect(frame).toHaveCount(1);

    // Frame context menu → Edit → the network modal (draft: pure-data rename).
    await frame.click({ button: "right" });
    const menu = page.getByTestId("cc-node-context-menu");
    await expect(menu).toBeVisible();
    await menu.getByTestId("cc-menu-edit").click();

    const newName = "Renamed Draft Net";
    await page.getByTestId("network-name-input").fill(newName);
    await page.getByTestId("submit-network").click({ force: true });

    // The frame label follows the rename immediately (no deploy).
    await expect(frame).toContainText(newName);
  });

  test("A draft resource can be disabled and re-enabled via its context menu", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);

    // Create a standalone draft resource (opens the editor; the node is added
    // on save).
    await createViaCanvasMenu(page, "new-resource");
    await page.getByTestId("resource-name-input").fill("toggle-res");
    await page.getByTestId("resource-address-input").fill("10.5.6.7/32");
    await page.getByTestId("submit-resource").click({ force: true });

    const resource = canvasNode(page, "resource-new-");
    await expect(resource).toHaveCount(1);

    const openMenu = async () => {
      await resource.click({ button: "right" });
      const menu = page.getByTestId("cc-node-context-menu");
      await expect(menu).toBeVisible();
      return menu;
    };

    // Enabled resource offers "Disable"; toggling flips the menu to "Enable".
    let menu = await openMenu();
    await menu.getByTestId("cc-menu-disable").click();

    menu = await openMenu();
    await expect(menu.getByTestId("cc-menu-enable")).toBeVisible();
    await menu.getByTestId("cc-menu-enable").click();

    // Back to enabled → "Disable" again.
    menu = await openMenu();
    await expect(menu.getByTestId("cc-menu-disable")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("Add Routing Peer on a draft network frame opens the routing-peer modal", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await createViaCanvasMenu(page, "new-network");
    const frame = canvasNode(page, "network-new-");
    await expect(frame).toHaveCount(1);

    await frame.click({ button: "right" });
    const menu = page.getByTestId("cc-node-context-menu");
    await expect(menu).toBeVisible();
    await menu.getByTestId("cc-menu-add-routing-peer").click();

    // The routing-peer modal (peer/group tabs) opens.
    await expect(page.getByTestId("routing-peer-tab-peer")).toBeVisible();
    await expect(page.getByTestId("routing-peer-tab-group")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("A draft resource can be renamed via its context menu", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await createViaCanvasMenu(page, "new-resource");
    await page.getByTestId("resource-name-input").fill("orig-res");
    await page.getByTestId("resource-address-input").fill("10.9.9.9/32");
    await page.getByTestId("submit-resource").click({ force: true });

    const resource = canvasNode(page, "resource-new-");
    await expect(resource).toHaveCount(1);

    await resource.click({ button: "right" });
    const menu = page.getByTestId("cc-node-context-menu");
    await expect(menu).toBeVisible();
    await menu.getByTestId("cc-menu-rename").click();

    await page.getByTestId("cc-rename-input").fill("renamed-res");
    await page.getByTestId("cc-rename-submit").click({ force: true });

    await expect(resource).toContainText("renamed-res");
  });
});
