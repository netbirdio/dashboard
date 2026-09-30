import { expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import { deleteGroupsByPrefix } from "../helpers/api";
import {
  canvasNode,
  enterDraft,
  expectChangeCount,
  resetDraftState,
} from "../helpers/control-center";

test.describe.serial("Control Center Draft Shortcuts @control-center", () => {
  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test.afterAll(async ({ dashboardAsOwner: page }) => {
    // Draft groups never hit the account; clean up any that leaked.
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

    // A blank policy is canvas-only until both sides are connected.
    await expect(canvasNode(page, "policy-new-")).toHaveCount(1);
    await expectChangeCount(page, 0);
  });
});
