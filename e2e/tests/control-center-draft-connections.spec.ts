import { expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import { createGroup, deleteGroup, listGroups } from "../helpers/api";
import { generateRandomName } from "../helpers/utils";
import {
  canvasNode,
  clickContextMenuItem,
  connectNodes,
  dragNodeOnto,
  dragTemplateToCanvas,
  enterDraft,
  expectChangeCount,
  readDraftChanges,
  resetDraftState,
  reviewButton,
  submitCreatePolicyModal,
} from "../helpers/control-center";

test.describe.serial(
  "Control Center Draft Connections @control-center",
  () => {
    test.beforeEach(async ({ dashboardAsOwner: page }) => {
      await resetDraftState(page);
    });

    test("Should create a policy by connecting two groups", async ({
      dashboardAsOwner: page,
    }) => {
      await enterDraft(page);
      // Two groups, placed apart so the connect drag has a clear path.
      const pane = await page.locator(".react-flow__pane").boundingBox();
      if (!pane) throw new Error("no pane");
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.45,
        y: pane.y + pane.height * 0.35,
      });
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.75,
        y: pane.y + pane.height * 0.65,
      });
      const groups = canvasNode(page, "group-new-");
      await expect(groups).toHaveCount(2);
      await expectChangeCount(page, 2);

      // Drag from the first group's right handle onto the second group —
      // the create-policy modal opens prefilled with both sides.
      await connectNodes(page, groups.nth(0), groups.nth(1));
      await expect(
        page.getByRole("heading", { name: "Create New Access Control Policy" }),
      ).toBeVisible();
      await submitCreatePolicyModal(page);

      // A complete policy lands on canvas with two edges and a tracked
      // create-policy change (2 groups + 1 policy = 3).
      await expect(canvasNode(page, "policy-new-")).toHaveCount(1);
      await expect(page.locator(".react-flow__edge")).toHaveCount(2);
      await expectChangeCount(page, 3);
      const changes = await readDraftChanges(page);
      expect(changes.filter((c) => c.type === "create-policy")).toHaveLength(1);
    });

    test("Should keep a placeholder-peer policy out of the changeset until the peer installs", async ({
      dashboardAsOwner: page,
    }) => {
      await enterDraft(page);
      const pane = await page.locator(".react-flow__pane").boundingBox();
      if (!pane) throw new Error("no pane");
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.45,
        y: pane.y + pane.height * 0.35,
      });
      await dragTemplateToCanvas(page, "cc-template-peer-server", {
        x: pane.x + pane.width * 0.75,
        y: pane.y + pane.height * 0.65,
      });
      const group = canvasNode(page, "group-new-").first();
      const peer = page.locator('.react-flow__node[data-id^="peer-"]');
      await expect(peer).toHaveCount(1);

      await connectNodes(page, peer, group);
      await expect(
        page.getByRole("heading", { name: "Create New Access Control Policy" }),
      ).toBeVisible();
      await submitCreatePolicyModal(page);

      // The policy node and edges exist on canvas…
      await expect(canvasNode(page, "policy-new-")).toHaveCount(1);
      // …but a policy referencing an uninstalled placeholder peer is
      // incomplete: only the group create and the pending peer install are
      // tracked.
      const changes = await readDraftChanges(page);
      expect(changes.filter((c) => c.type === "create-policy")).toHaveLength(0);
      expect(changes.filter((c) => c.type === "install-peer")).toHaveLength(1);
      await expectChangeCount(page, 2);
    });

    test("Should rename a group and propagate the name into the policy changeset", async ({
      dashboardAsOwner: page,
    }) => {
      await enterDraft(page);
      const pane = await page.locator(".react-flow__pane").boundingBox();
      if (!pane) throw new Error("no pane");
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.45,
        y: pane.y + pane.height * 0.35,
      });
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.75,
        y: pane.y + pane.height * 0.65,
      });
      const groups = canvasNode(page, "group-new-");
      await connectNodes(page, groups.nth(0), groups.nth(1));
      await submitCreatePolicyModal(page);
      await expectChangeCount(page, 3);

      // Rename the source group via its context menu.
      const sourceGroup = groups.nth(0);
      const newName = generateRandomName("cc-renamed-");
      await clickContextMenuItem(page, sourceGroup, "Rename");
      await page.getByTestId("cc-rename-input").fill(newName);
      await page.getByTestId("cc-rename-submit").click();

      // The canvas node shows the new name…
      await expect(sourceGroup).toContainText(newName);
      // …the rename folded into the create-group entry (still 3 changes)…
      await expectChangeCount(page, 3);
      const changes = await readDraftChanges(page);
      expect(
        changes.some((c) => c.type === "create-group" && c.name === newName),
      ).toBe(true);
      // …and the policy's group reference followed the rename.
      const policy = changes.find((c) => c.type === "create-policy");
      const rule = policy.policy.rules[0];
      const referenced = [...(rule.sources ?? []), ...(rule.destinations ?? [])]
        .map((g) => (typeof g === "string" ? g : g.name));
      expect(referenced).toContain(newName);

      // Reopening the policy editor must show the renamed group SELECTED in
      // the group selector (the modal seeds from the canvas policy node).
      const policyNode = canvasNode(page, "policy-new-");
      await clickContextMenuItem(page, policyNode, "Edit");
      await expect(page.getByTestId("source-group-selector")).toContainText(
        newName,
      );
      await page.keyboard.press("Escape");
    });

    test("Should create a group inline in the policy modal and show it on canvas", async ({
      dashboardAsOwner: page,
    }) => {
      await enterDraft(page);
      const pane = await page.locator(".react-flow__pane").boundingBox();
      if (!pane) throw new Error("no pane");
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.45,
        y: pane.y + pane.height * 0.35,
      });
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.75,
        y: pane.y + pane.height * 0.65,
      });
      const groups = canvasNode(page, "group-new-");
      await connectNodes(page, groups.nth(0), groups.nth(1));
      await expect(
        page.getByRole("heading", { name: "Create New Access Control Policy" }),
      ).toBeVisible();

      // Type a brand-new group name into the destination selector and add it.
      const inlineName = generateRandomName("cc-inline-");
      await page.getByTestId("destination-group-selector").click();
      await page
        .getByTestId("destination-group-selector-search")
        .fill(inlineName);
      await page.keyboard.press("Enter");
      await page.keyboard.press("Escape"); // close the selector dropdown
      await submitCreatePolicyModal(page);

      // The inline group exists on canvas as its own draft node and as a
      // create-group change.
      await expect(
        page.locator(".react-flow__node", { hasText: inlineName }),
      ).toHaveCount(1);
      const changes = await readDraftChanges(page);
      expect(
        changes.some(
          (c) => c.type === "create-group" && c.name === inlineName,
        ),
      ).toBe(true);
    });

    test("Should edit a draft policy and reflect the change on the canvas", async ({
      dashboardAsOwner: page,
    }) => {
      await enterDraft(page);
      const pane = await page.locator(".react-flow__pane").boundingBox();
      if (!pane) throw new Error("no pane");
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.45,
        y: pane.y + pane.height * 0.35,
      });
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.75,
        y: pane.y + pane.height * 0.65,
      });
      const groups = canvasNode(page, "group-new-");
      await connectNodes(page, groups.nth(0), groups.nth(1));
      await submitCreatePolicyModal(page);
      const policyNode = canvasNode(page, "policy-new-");
      await expect(policyNode).toHaveCount(1);

      // Edit via context menu, rename the policy on the General tab.
      const newName = generateRandomName("cc-policy-");
      await clickContextMenuItem(page, policyNode, "Edit");
      await expect(
        page.getByRole("heading", { name: "Update Access Control Policy" }),
      ).toBeVisible();
      // The name field lives on the Name & Description tab.
      await page.getByRole("tab", { name: "Name & Description" }).click();
      await page.getByTestId("policy-name").fill(newName);
      await page.getByTestId("submit-policy").click();

      // Canvas node text and the pending create-policy entry both updated.
      await expect(policyNode).toContainText(newName);
      const changes = await readDraftChanges(page);
      const policy = changes.find((c) => c.type === "create-policy");
      expect(policy.policy.name).toBe(newName);
    });

    test("Should remove a draft policy from the canvas without a confirmation", async ({
      dashboardAsOwner: page,
    }) => {
      await enterDraft(page);
      const pane = await page.locator(".react-flow__pane").boundingBox();
      if (!pane) throw new Error("no pane");
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.45,
        y: pane.y + pane.height * 0.35,
      });
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.75,
        y: pane.y + pane.height * 0.65,
      });
      const groups = canvasNode(page, "group-new-");
      await connectNodes(page, groups.nth(0), groups.nth(1));
      await submitCreatePolicyModal(page);
      await expectChangeCount(page, 3);

      // Remove is canvas-only: no confirm dialog, pending create cancelled,
      // endpoint groups stay on canvas.
      const policyNode = canvasNode(page, "policy-new-");
      await clickContextMenuItem(page, policyNode, "Remove");
      await expect(page.getByTestId("confirmation.confirm")).not.toBeVisible();
      await expect(policyNode).toHaveCount(0);
      await expect(page.locator(".react-flow__edge")).toHaveCount(0);
      await expect(groups).toHaveCount(2);
      await expectChangeCount(page, 2);
    });

    test("Should drop a peer into a group and track the membership", async ({
      dashboardAsOwner: page,
    }) => {
      await enterDraft(page);
      const pane = await page.locator(".react-flow__pane").boundingBox();
      if (!pane) throw new Error("no pane");
      await dragTemplateToCanvas(page, "cc-template-group", {
        x: pane.x + pane.width * 0.45,
        y: pane.y + pane.height * 0.35,
      });
      await dragTemplateToCanvas(page, "cc-template-peer-server", {
        x: pane.x + pane.width * 0.75,
        y: pane.y + pane.height * 0.65,
      });
      const group = canvasNode(page, "group-new-").first();
      const peer = page.locator('.react-flow__node[data-id^="peer-"]');
      await expect(peer).toHaveCount(1);

      // Dragging the peer NODE onto the group absorbs it as a member: the
      // peer node leaves the canvas and the group's counter increments.
      await dragNodeOnto(page, peer, group);
      await expect(peer).toHaveCount(0);
      await expect(group).toContainText(/1\s*peer/i);

      // The membership folded into the group's create entry.
      const changes = await readDraftChanges(page);
      const createGroupChange = changes.find(
        (c) => c.type === "create-group",
      );
      expect(createGroupChange.peerIds).toHaveLength(1);
      // group create + the peer's pending install step
      await expectChangeCount(page, 2);

      // The group's Details panel lists the dropped (placeholder) peer even
      // though it isn't in the API peer list.
      await clickContextMenuItem(page, group, "Details");
      await expect(
        page.getByText("Server", { exact: false }).last(),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    });

    test("Should delete an existing group in draft and deploy the deletion", async ({
      dashboardAsOwner: page,
    }) => {
      // Seed a real group via the API, then reload so the dashboard and the
      // components panel know it.
      const name = generateRandomName("cc-delete-");
      const seeded = await createGroup(page, name);
      await page.reload();
      await expect(page.locator(".react-flow__pane")).toBeVisible();
      await enterDraft(page);

      // Pull the existing group onto the canvas from the components panel
      // (search narrows the virtualized list so the row is rendered).
      await page.getByTestId("cc-toolbar-add").click();
      await page.getByPlaceholder(/Search components/).fill(name);
      await dragTemplateToCanvas(page, `cc-panel-group-${seeded.id}`);

      const groupNode = page.locator(
        `.react-flow__node[data-id="group-${seeded.id}"]`,
      );
      await expect(groupNode).toHaveCount(1);

      // Delete (not Remove) an existing group: confirmed, tracked, deployed.
      await clickContextMenuItem(page, groupNode, "Delete");
      await expect(
        page.getByText(`Delete group "${name}"?`),
      ).toBeVisible();
      await page.getByTestId("confirmation.confirm").click();
      await expect(groupNode).toHaveCount(0);
      await expectChangeCount(page, 1);

      await reviewButton(page).click();
      const deleteResponse = page.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/groups/${seeded.id}`) &&
          resp.request().method() === "DELETE",
        { timeout: 30_000 },
      );
      await page.getByTestId("cc-deploy").click({ force: true });
      const response = await deleteResponse;
      expect(response.status()).toBeLessThan(300);

      const remaining = await listGroups(page);
      expect(remaining.some((g) => g.id === seeded.id)).toBe(false);
    });

    test.afterAll(async ({ browser }) => {
      // Safety net: clear any seeded groups left behind by failed runs.
      const context = await browser.newContext({
        storageState: "e2e/fixtures/auth/owner.json",
      });
      const page = await context.newPage();
      await page.goto("/peers");
      const groups = await listGroups(page).catch(() => []);
      for (const g of groups) {
        if (g.name.startsWith("cc-delete-") || g.name.startsWith("cc-inline-")) {
          await deleteGroup(page, g.id).catch(() => {});
        }
      }
      await context.close();
    });
  },
);
