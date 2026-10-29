import { expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import {
  createGroup,
  createPolicy,
  deleteGroupsByPrefix,
  deletePoliciesBySubstring,
} from "../helpers/api";
import { generateRandomName } from "../helpers/utils";
import {
  canvasNode,
  dismissBlockingOverlays,
  openControlCenter,
  resetDraftState,
} from "../helpers/control-center";
import { routeMockPeer } from "../helpers/mock-peer";

/**
 * Live PEER view with a mocked registered peer (the test env has no peers
 * otherwise). The view is built from the /peers list alone, so a listed,
 * offline peer is all it needs.
 */
test.describe.serial("Control Center Peers @control-center", () => {
  const PREFIX = "cc-peer-";

  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test.afterAll(async ({ dashboardAsOwner: page }) => {
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);
  });

  test("Should render a registered peer (with its policy) in the peers view", async ({
    dashboardAsOwner: page,
  }) => {
    await deletePoliciesBySubstring(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);

    // The peer view only graphs policies where the peer's groups are sources.
    const srcGroup = await createGroup(page, generateRandomName(PREFIX));
    const dstGroup = await createGroup(page, generateRandomName(PREFIX));
    const policy = await createPolicy(
      page,
      generateRandomName(PREFIX),
      srcGroup.id,
      dstGroup.id,
    );

    const host = generateRandomName(PREFIX);
    // The mock lists the peer first, so the view auto-selects it.
    const peers = await routeMockPeer(page);
    try {
      const registered = peers.register(host, [
        { id: srcGroup.id, name: srcGroup.name },
      ]);
      await openControlCenter(page, "peers");
      await registered;
      await dismissBlockingOverlays(page);

      await expect(
        page.locator('.react-flow__node[data-id="select-peer-node"]'),
      ).toBeVisible();
      await expect(canvasNode(page, `policy-${policy.id}`)).toBeVisible();
      await expect(page.getByText(host).first()).toBeVisible();
    } finally {
      await peers.dispose();
    }
  });
});
