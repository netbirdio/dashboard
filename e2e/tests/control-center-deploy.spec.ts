import { expect } from "@playwright/test";
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

/**
 * End-to-end DRAFT → DEPLOY: build a changeset with two groups and a policy
 * connecting them, deploy, and verify all three land in the real account in
 * dependency order (the policy references the groups' REAL ids, which only
 * works if the groups were created first). The matrix specs assert the
 * changeset but never actually deploy a multi-entity draft — this fills that
 * gap. IDs are captured from the POST responses so cleanup is precise (the
 * canvas assigns generic names like "Group"/"Policy").
 */
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

    // Collect ids created during deploy so cleanup is exact.
    const createdGroupIds: string[] = [];
    const createdPolicyIds: string[] = [];
    page.on("response", async (resp) => {
      if (resp.request().method() !== "POST") return;
      const url = resp.url();
      if (url.includes("/api/groups")) {
        const b = await resp.json().catch(() => null);
        if (b?.id) createdGroupIds.push(b.id);
      } else if (url.includes("/api/policies")) {
        const b = await resp.json().catch(() => null);
        if (b?.id) createdPolicyIds.push(b.id);
      }
    });

    await reviewButton(page).click();
    await expect(page.getByTestId("cc-deploy")).toBeVisible();
    await page.getByTestId("cc-deploy").click({ force: true });

    // Deploy finishes by exiting the draft back to live.
    await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible({
      timeout: 30_000,
    });

    try {
      // Two groups + one policy were created against the account.
      await expect.poll(() => createdGroupIds.length).toBe(2);
      await expect.poll(() => createdPolicyIds.length).toBe(1);

      // The deployed policy references BOTH new groups by their REAL ids —
      // proof the groups were created before the policy (dependency order).
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
      // Cleanup: policy first (a group in use can't be deleted), then groups.
      for (const pid of createdPolicyIds) await deletePolicyById(page, pid);
      for (const gid of createdGroupIds) await deleteGroup(page, gid);
    }
  });
});
