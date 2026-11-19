import { deleteGroupsByPrefix } from "../helpers/api";
import { navigateTo } from "../helpers/auth";
import { expect, test } from "../helpers/fixtures";
import { routeMockPeer } from "../helpers/mock-peer";
import { visitByNavigation } from "../helpers/navigation";
import { generateRandomName } from "../helpers/utils";

/* Exit nodes have no management API yet: the dashboard answers /exit-nodes
   (and the policies that target an exit node) from an in-memory mock that is
   seeded on page load. A reload starts over, so each test stays on one page
   load and moves between pages through the sidebar only. */

const PREFIX = "exit-node-";

test.describe.serial("Exit Nodes @network", () => {
  test("Should list the seeded exit nodes from the sidebar", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/peers");
    await visitByNavigation(page, "Network Routing");
    await visitByNavigation(page, "Exit Nodes");

    await expect(
      page.getByRole("heading", { name: /Exit Nodes/ }),
    ).toBeVisible();
    for (const name of ["EU Egress", "US Egress", "Contractors Egress"]) {
      await expect(page.locator("tr").filter({ hasText: name })).toBeVisible();
    }
  });

  test("Should create an exit node with a peer and a policy, then delete it", async ({
    dashboardAsOwner: page,
  }) => {
    await deleteGroupsByPrefix(page, PREFIX);
    await navigateTo(page, "/exit-nodes");
    await expect(
      page.locator("tr").filter({ hasText: "EU Egress" }),
    ).toBeVisible();

    // A peer the seed hasn't used yet, so it can be picked.
    const host = generateRandomName(PREFIX);
    const peers = await routeMockPeer(page);
    try {
      const registered = peers.register(host, []);

      const name = generateRandomName(PREFIX);
      const sourceGroup = generateRandomName(PREFIX);

      await page.getByTestId("add-exit-node").click();
      await expect(page.getByTestId("exit-node-continue")).toBeDisabled();

      // Peers: the peer selector refetches the peers when it mounts.
      await page.getByTestId("exit-node-add-peer").click();
      await registered;
      await page
        .getByPlaceholder("Search for peers by name or ip...")
        .fill(host);
      await page.getByText(host, { exact: true }).click();
      await expect(page.getByTestId("exit-node-peer-metric")).toHaveValue(
        "100",
      );
      await page.getByTestId("exit-node-continue").click();

      // Name & Description, then Additional Settings
      await page.getByTestId("exit-node-name-input").fill(name);
      await page.getByTestId("exit-node-continue").click();
      await page.getByTestId("exit-node-continue").click();

      // Access Control: a policy whose destination is the new exit node
      await page.getByTestId("exit-node-add-policy").click();
      await page.getByTestId("source-group-selector").click();
      const search = page.getByTestId("source-group-selector-search");
      await search.fill(sourceGroup);
      await search.press("Enter");
      await search.press("Escape");
      await page.getByTestId("policy-continue").click();
      await page.getByTestId("policy-continue").click();
      await page.getByTestId("submit-policy").click();
      await expect(page.getByText(`${name} Access`)).toBeVisible();

      await page.getByTestId("submit-exit-node").click();

      const row = page.locator("tr").filter({ hasText: name });
      await expect(row).toBeVisible();
      await expect(row.getByTestId("exit-node-policies")).toContainText("1");

      // The policy shows on the Access Control page with the exit node as destination.
      await visitByNavigation(page, "Access Control");
      await visitByNavigation(page, "Policies");
      const policyRow = page
        .locator("tr")
        .filter({ hasText: `${name} Access` });
      await expect(policyRow).toBeVisible();
      await expect(policyRow).toContainText(name);

      // Deleting the exit node deletes its policy too.
      await visitByNavigation(page, "Network Routing");
      await visitByNavigation(page, "Exit Nodes");
      await page
        .locator("tr")
        .filter({ hasText: name })
        .getByLabel("Exit node actions")
        .click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await page.getByTestId("confirmation.confirm").click();
      await expect(
        page.locator("tr").filter({ hasText: name }),
      ).not.toBeVisible();
    } finally {
      await peers.dispose();
      await deleteGroupsByPrefix(page, PREFIX);
    }
  });
});
