import { expect } from "@playwright/test";
import { deleteGroup, listGroups } from "../helpers/api";
import {
  canvasNode,
  dragTemplateToCanvas,
  enterDraft,
  expectChangeCount,
  resetDraftState,
  reviewButton,
} from "../helpers/control-center";
import { test } from "../helpers/fixtures";
import { visitByNavigation } from "../helpers/navigation";

test.describe.serial("Control Center Draft Mode @control-center", () => {
  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test("Should enter and leave draft mode without changes", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await expect(page.getByTestId("cc-draft-cancel")).toBeVisible();
    await expectChangeCount(page, 0);

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
  });

  test("Should undo and redo the dropped group", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await dragTemplateToCanvas(page, "cc-template-group");
    const groupNode = canvasNode(page, "group-new-");
    await expect(groupNode).toHaveCount(1);

    // History snapshots are debounced, so wait for Undo to arm.
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

  test("Should discard the draft on reload (state is not persisted)", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await dragTemplateToCanvas(page, "cc-template-group");
    await expectChangeCount(page, 1);

    // Draft state lives only in React, so a reload drops it.
    await page.reload();
    await expect(page.locator(".react-flow__pane")).toBeVisible();
    await expect(page.getByTestId("cc-mode-draft")).toBeVisible();
    await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible();
    await expect(canvasNode(page, "group-new-")).toHaveCount(0);
  });

  test("Should confirm before discarding draft changes", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await dragTemplateToCanvas(page, "cc-template-group");
    await expectChangeCount(page, 1);

    await page.getByTestId("cc-draft-cancel").click();
    await expect(page.getByText("Discard draft changes?")).toBeVisible();
    await page.getByTestId("confirmation.cancel").click();
    await expect(page.getByTestId("cc-toolbar-add")).toBeVisible();
    await expectChangeCount(page, 1);

    await page.getByTestId("cc-draft-cancel").click();
    await page.getByTestId("confirmation.confirm").click();
    await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible();
  });

  test("Should confirm before leaving draft via sidebar navigation", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await dragTemplateToCanvas(page, "cc-template-group");
    await expectChangeCount(page, 1);

    await visitByNavigation(page, "Peers");
    await expect(page.getByText("Discard draft changes?")).toBeVisible();
    await page.getByTestId("confirmation.cancel").click();
    await expect(page).toHaveURL(/control-center/);
    await expectChangeCount(page, 1);

    await visitByNavigation(page, "Peers");
    await page.getByTestId("confirmation.confirm").click();
    await expect(page).toHaveURL(/peers/);
  });

  test("Should deploy a created group to the live account", async ({
    dashboardAsOwner: page,
  }) => {
    await enterDraft(page);
    await dragTemplateToCanvas(page, "cc-template-group");
    await expectChangeCount(page, 1);

    await reviewButton(page).click();
    await expect(
      page.getByRole("heading", { name: "Review & Deploy" }),
    ).toBeVisible();

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

    await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible();

    const groups = await listGroups(page);
    expect(groups.some((g) => g.id === created.id)).toBe(true);
    await deleteGroup(page, created.id);
  });
});
