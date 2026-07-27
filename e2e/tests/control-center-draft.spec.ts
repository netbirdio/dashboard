import { Page, expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import { deleteGroup, listGroups } from "../helpers/api";
import {
  CHANGES_KEY,
  CANVAS_KEY,
  canvasNode,
  dragTemplateToCanvas,
  enterDraft,
  expectChangeCount,
  resetDraftState,
  reviewButton,
} from "../helpers/control-center";

test.describe.serial("Control Center Draft Mode @control-center", () => {
  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    // Every test starts from a clean live view: no leftover draft storage
    // from a previous (possibly failed) test.
    await resetDraftState(page);
  });

  test("Should enter and leave draft mode without changes", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await expect(page.getByTestId("cc-draft-cancel")).toBeVisible();
    await expectChangeCount(page, 0);

    // No pending changes — switching back to live must not ask to confirm.
    await page.getByTestId("cc-mode-live").click();
    await expect(page.getByTestId("confirmation.confirm")).not.toBeVisible();
    await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible();
  });

  test("Should add a draft group via drag and drop and track the change", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await dragTemplateToCanvas(page, "cc-template-group");

    await expect(canvasNode(page, "group-new-")).toHaveCount(1);
    await expectChangeCount(page, 1);

    // The changeset is persisted to localStorage on every update.
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), CHANGES_KEY),
      )
      .toContain("create-group");
  });

  test("Should undo and redo the dropped group", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await dragTemplateToCanvas(page, "cc-template-group");
    const groupNode = canvasNode(page, "group-new-");
    await expect(groupNode).toHaveCount(1);

    // History snapshots are debounced (300ms) — wait for Undo to arm
    // instead of clicking immediately.
    const undo = page.getByTestId("cc-toolbar-undo");
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(groupNode).toHaveCount(0);
    await expectChangeCount(page, 0);

    const redo = page.getByTestId("cc-toolbar-redo");
    await expect(redo).toBeEnabled();
    await redo.click();
    await expect(groupNode).toHaveCount(1);
    await expectChangeCount(page, 1);
  });

  test("Should restore the draft from storage after a reload", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await dragTemplateToCanvas(page, "cc-template-group");
    await expectChangeCount(page, 1);
    // Wait for the canvas snapshot to land in storage before reloading.
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), CANVAS_KEY))
      .toContain("group-new-");

    await page.reload();
    await expect(page.locator(".react-flow__pane")).toBeVisible();
    // A reload returns to live; re-entering draft restores the snapshot
    // instead of rebuilding from the live view.
    await enterDraft(page);
    await expect(canvasNode(page, "group-new-")).toHaveCount(1);
    await expectChangeCount(page, 1);
  });

  test("Should confirm before discarding draft changes", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await dragTemplateToCanvas(page, "cc-template-group");
    await expectChangeCount(page, 1);

    // Cancelling the confirmation keeps the draft.
    await page.getByTestId("cc-draft-cancel").click();
    await expect(page.getByText("Discard draft changes?")).toBeVisible();
    await page.getByTestId("confirmation.cancel").click();
    await expect(page.getByTestId("cc-toolbar-add")).toBeVisible();
    await expectChangeCount(page, 1);

    // Confirming discards and returns to live with storage cleared.
    await page.getByTestId("cc-draft-cancel").click();
    await page.getByTestId("confirmation.confirm").click();
    await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), CHANGES_KEY),
      )
      .toBeNull();
  });

  test("Should deploy a created group to the live account", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await dragTemplateToCanvas(page, "cc-template-group");
    await expectChangeCount(page, 1);

    await reviewButton(page).click();
    await expect(page.getByText("Review & Deploy")).toBeVisible();
    // The single pending change is a group create.
    await expect(page.getByText("Create", { exact: true })).toBeVisible();

    const createResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/groups") &&
        resp.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByTestId("cc-deploy").click({ force: true });
    const response = await createResponse;
    expect([200, 201]).toContain(response.status());
    const created = await response.json();

    // Deploy exits the draft back to the rebuilt live view.
    await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), CHANGES_KEY),
      )
      .toBeNull();

    // The group really exists in the account — then clean it up.
    const groups = await listGroups(page);
    expect(groups.some((g) => g.id === created.id)).toBe(true);
    await deleteGroup(page, created.id);
  });
});
