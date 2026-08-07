import { expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import { deleteGroupsByPrefix } from "../helpers/api";
import {
  canvasNode,
  enterDraft,
  expectChangeCount,
  resetDraftState,
} from "../helpers/control-center";

/**
 * Draft-mode keyboard shortcuts (Alt/⌥ + digit) create nodes at the viewport
 * centre — the same set as the canvas context menu:
 *   1 Server · 2 Agent · 3 Policy · 4 Group · 5 Network · 6 Resource
 * (draft-only, input-aware; see useControlCenterShortcuts / CanvasContextMenu).
 */
test.describe.serial("Control Center Draft Shortcuts @control-center", () => {
  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test.afterAll(async ({ dashboardAsOwner: page }) => {
    // A deployed/created draft group never hits the account (we discard), but
    // be safe about any that leaked.
    await deleteGroupsByPrefix(page, "New Group");
  });

  test("Alt+4 creates a new group on the canvas", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);

    // Focus the canvas pane so the shortcut isn't swallowed by an input.
    await page.locator(".react-flow__pane").click();
    await page.keyboard.press("Alt+4");

    await expect(canvasNode(page, "group-new-")).toHaveCount(1);
    await expectChangeCount(page, 1);
  });

  test("Alt+3 adds a policy node (canvas-only, not yet tracked)", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await page.locator(".react-flow__pane").click();
    await page.keyboard.press("Alt+3");

    // A blank policy is canvas-only until both sides are connected, so it
    // renders but does not enter the changeset.
    await expect(canvasNode(page, "policy-new-")).toHaveCount(1);
    await expectChangeCount(page, 0);
  });
});
