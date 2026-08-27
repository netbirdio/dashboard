import { expect, type Response } from "@playwright/test";
import { test } from "../helpers/fixtures";
import { deleteGroup, deletePolicyById, listPolicies } from "../helpers/api";
import {
  canvasNode,
  connectNodes,
  createViaCanvasMenu,
  enterDraft,
  expectChangeCount,
  resetDraftState,
  reviewButton,
} from "../helpers/control-center";

test.describe.serial("Control Center Deploy @control-center", () => {
  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test("Deploys a group+group+policy draft to the account in dependency order", async ({
    dashboardAsOwner: page,
  }) => {
    test.setTimeout(60_000);
    await enterDraft(page);

    await createViaCanvasMenu(page, "new-group", { fx: 0.3, fy: 0.4 });
    await createViaCanvasMenu(page, "new-group", { fx: 0.3, fy: 0.7 });
    const groups = canvasNode(page, "group-new-");
    await expect(groups).toHaveCount(2);

    await createViaCanvasMenu(page, "new-policy", { fx: 0.65, fy: 0.5 });
    const policy = canvasNode(page, "policy-new-");
    await expect(policy).toHaveCount(1);

    // g0 as source, g1 as destination → a complete, trackable policy.
    await connectNodes(page, groups.nth(0), policy, "sr");
    await connectNodes(page, groups.nth(1), policy, "sl");
    await expectChangeCount(page, 3);

    // The canvas assigns generic names, so capture the ids for exact cleanup.
    const createdGroupIds: string[] = [];
    const createdPolicyIds: string[] = [];
    const collectCreatedIds = async (resp: Response) => {
      if (resp.request().method() !== "POST") return;
      const url = resp.url();
      if (url.includes("/api/groups")) {
        const b = await resp.json().catch(() => null);
        if (b?.id) createdGroupIds.push(b.id);
      } else if (url.includes("/api/policies")) {
        const b = await resp.json().catch(() => null);
        if (b?.id) createdPolicyIds.push(b.id);
      }
    };
    page.on("response", collectCreatedIds);

    await reviewButton(page).click();
    await expect(page.getByTestId("cc-deploy")).toBeVisible();
    await page.getByTestId("cc-deploy").click({ force: true });

    // Deploy finishes by exiting the draft back to live.
    await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible({
      timeout: 30_000,
    });

    try {
      await expect.poll(() => createdGroupIds.length).toBe(2);
      await expect.poll(() => createdPolicyIds.length).toBe(1);

      // Real group ids in the deployed policy prove the groups were created
      // before it.
      const policies = await listPolicies(page);
      const deployed = policies.find((p) => p.id === createdPolicyIds[0]);
      expect(deployed).toBeTruthy();
      const rule = deployed!.rules[0];
      const refIds = [
        ...(rule.sources ?? []),
        ...(rule.destinations ?? []),
      ].map((x: any) => (typeof x === "string" ? x : x?.id));
      for (const gid of createdGroupIds) expect(refIds).toContain(gid);
    } finally {
      // The owner page is worker-scoped, so an attached listener would keep
      // reading response bodies for every later test on this worker.
      page.off("response", collectCreatedIds);
      // Policy first: a group in use can't be deleted.
      for (const pid of createdPolicyIds) await deletePolicyById(page, pid);
      for (const gid of createdGroupIds) await deleteGroup(page, gid);
    }
  });
});
