import { expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import {
  createGroup,
  createPolicy,
  deleteGroupsByPrefix,
  deletePeersByPrefix,
  deletePoliciesBySubstring,
} from "../helpers/api";
import { generateRandomName } from "../helpers/utils";
import {
  canvasNode,
  dismissBlockingOverlays,
  openControlCenter,
  resetDraftState,
} from "../helpers/control-center";
import { cleanupDockerPeer, registerDockerPeer } from "../helpers/docker-peer";

/**
 * Live PEER view, exercised with a REAL docker peer registered via a setup key
 * (the test env has no peers otherwise). Registration is confirmed working
 * against management directly; the peer stays offline (no signal/TURN) but is
 * selectable, which is all the Peer view needs. See §5 of the summary.
 *
 * These are @slow: registering a peer takes ~10–20s.
 */
test.describe.serial("Control Center Peers @control-center", () => {
  const PREFIX = "cc-peer-";
  const hosts: string[] = [];

  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await resetDraftState(page);
  });

  test.afterAll(async ({ dashboardAsOwner: page }) => {
    for (const h of hosts) await cleanupDockerPeer(page, h);
    await deletePoliciesBySubstring(page, PREFIX);
    await deletePeersByPrefix(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);
  });

  test("Should register a docker peer and render it (with its policy) in the peers view", async ({
    dashboardAsOwner: page,
  }) => {
    // Registration + render can take a while under emulation.
    test.setTimeout(120_000);

    // Clean slate so the peer view auto-selects OUR peer (peers[0]) and the
    // group view logic isn't confused by leftover fixtures.
    await deletePoliciesBySubstring(page, PREFIX);
    await deletePeersByPrefix(page, PREFIX);
    await deleteGroupsByPrefix(page, PREFIX);

    // A source group the peer belongs to, plus a policy from it — so the peer
    // view (which shows policies where the peer's groups are sources) renders
    // a real graph, not just the lone peer node.
    const srcGroup = await createGroup(page, generateRandomName(PREFIX));
    const dstGroup = await createGroup(page, generateRandomName(PREFIX));
    const policy = await createPolicy(
      page,
      generateRandomName(PREFIX),
      srcGroup.id,
      dstGroup.id,
    );

    const host = "cc-peer-" + generateRandomName();
    hosts.push(host);
    const peer = await registerDockerPeer(page, host, [srcGroup.id]);
    expect(peer.name).toBe(host);

    await openControlCenter(page, "peers");
    await dismissBlockingOverlays(page);

    // The peer is auto-selected; its select node and its policy render.
    await expect(
      page.locator('.react-flow__node[data-id="select-peer-node"]'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(canvasNode(page, `policy-${policy.id}`)).toBeVisible({
      timeout: 15_000,
    });
    // The peer's name is shown on the canvas.
    await expect(page.getByText(host).first()).toBeVisible();
  });
});
