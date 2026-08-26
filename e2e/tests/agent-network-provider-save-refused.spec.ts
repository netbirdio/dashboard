/**
 * Agent Network provider save: what the operator sees when the backend refuses.
 *
 * Saving a provider checks its upstream URL and credential against the vendor
 * before storing anything, so a 422 naming the field to correct is an ordinary
 * outcome of the form rather than a server fault. Four things have to hold,
 * and each one has been wrong at some point:
 *
 *   - while the check runs the submit says so and refuses a second click. The
 *     vendor call is the slow part and an unreachable upstream drags it out to
 *     a timeout, which looked exactly like a button that had not registered
 *     the first click.
 *   - exactly ONE toast, the shared "Request failed with status code N", which
 *     quotes the API's own sentence. A second toast from the save path said the
 *     same thing under a vaguer title.
 *   - the toast is styled as a failure. notify() renders green with a check
 *     mark unless told otherwise, so a refusal announced itself as a success.
 *   - the modal stays open with the typed values intact. The API never returns
 *     an API key, so closing the form loses it with nowhere to retype it.
 *
 * The refusal is mocked rather than provoked: the backend check ships with a
 * management build these tests do not pin, and what is under test here is the
 * dashboard's handling of the response, not the vendor call that produces it.
 */
import { type Browser, expect, type Page, test } from "@playwright/test";
import { loginToApp } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";

const AGENT_NETWORK_CONFIG_KEY = "netbird-test-agent-network";
const PROVIDERS_ENDPOINT = /\/api\/agent-network\/providers(\?|$)/;
const PROVIDER_PREFIX = "e2e-refused-";
const TITLE_TESTID = "notification-title";

// The message a refused save carries: the backend names which of the two
// fields is at fault, without a status code and without echoing the URL.
const REFUSAL = "the upstream url could not be reached: no such host";

// Matched case-insensitively on purpose. The backend lowercases its messages
// (WriteError does, and the copy is written for it) while the toast uppercases
// the first character before rendering. Asserting either spelling would pin
// the test to that transform rather than to the sentence the operator reads.
const REFUSAL_TEXT = new RegExp(
  REFUSAL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  "i",
);

async function newAgentNetworkPage(browser: Browser): Promise<{
  page: Page;
  close: () => Promise<void>;
}> {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key as string, value as string);
      } catch (e) {}
    },
    [AGENT_NETWORK_CONFIG_KEY, "enabled"],
  );
  const page = await context.newPage();
  await loginToApp(page, "owner");
  return { page, close: () => context.close() };
}

// How long the mocked create takes to answer. The real check is a vendor round
// trip, so a save is never instant; holding the response gives the in-flight
// assertions a window to run in without racing the toast.
const REFUSAL_DELAY_MS = 1500;

// refuseProviderCreate answers the create with the 422 the credential check
// produces. Only POST is intercepted: the page still lists providers, and the
// settings bootstrap that may precede the create is left alone.
async function refuseProviderCreate(page: Page) {
  await page.route(PROVIDERS_ENDPOINT, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const origin = route.request().headers()["origin"] || "*";
    await new Promise((resolve) => setTimeout(resolve, REFUSAL_DELAY_MS));
    await route.fulfill({
      status: 422,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": origin,
      },
      body: JSON.stringify({ code: 422, message: REFUSAL }),
    });
  });
}

test.describe
  .serial("Agent Network refused provider save @agent-network", () => {
  test("reports the refusal once and keeps the form open", async ({
    browser,
  }) => {
    const { page, close } = await newAgentNetworkPage(browser);
    try {
      await refuseProviderCreate(page);

      await page.goto("/agent-network/providers");
      await page.keyboard.press("Escape");

      await page
        .getByRole("button", { name: "Connect Provider" })
        .first()
        .click({ force: true });

      const providerName = generateRandomName(PROVIDER_PREFIX);
      await page.locator('input[value="OpenAI API"]').fill(providerName);
      await page.getByPlaceholder("sk-...").first().fill("sk-e2e-refused-key");

      // The submit lives on the Models tab — the Provider tab's primary button
      // only advances to it. Matched on both spellings of its label so the
      // same locator follows it into the in-flight state.
      await page.getByRole("tab", { name: "Models" }).click({ force: true });
      const submit = page
        .getByRole("button", { name: /Connect(ing)? [Pp]rovider/ })
        .last();
      await expect(submit).toBeEnabled();
      await submit.click({ force: true });

      // ---- the wait is visible while it lasts ----
      // A second create is not idempotent, so the button has to say it is
      // working and stop taking clicks rather than sit there looking untouched.
      await expect(submit).toContainText("Connecting provider");
      await expect(submit).toBeDisabled();

      // ---- the toast says what the API said ----
      const title = page.getByTestId(TITLE_TESTID).first();
      await expect(title).toContainText("Request failed with status code 422");
      await expect(
        page.locator("[data-toast-notification]").first(),
      ).toContainText(REFUSAL_TEXT);

      // ---- and only that toast ----
      // The save path used to add its own on top, so the count is the
      // assertion rather than the presence of the right one.
      await expect(page.locator("[data-toast-notification]")).toHaveCount(1);
      await expect(page.getByText("Failed to connect provider")).toHaveCount(0);

      // ---- styled as a failure, not a success ----
      // notify() paints the icon tile green with a check unless the caller
      // says otherwise, which is how a refusal once looked like a success.
      await expect(
        page.locator("[data-toast-notification] .bg-red-500").first(),
      ).toBeVisible();
      await expect(
        page.locator("[data-toast-notification] .bg-green-500"),
      ).toHaveCount(0);

      // ---- the form is still there, still holding what was typed ----
      // The submit only exists while the modal is open, so its presence is the
      // check that nothing closed underneath the toast. It also has to come
      // back out of the in-flight state, or the retry the toast asks for is
      // impossible.
      await expect(submit).toBeVisible();
      await expect(submit).toBeEnabled();
      await expect(submit).toContainText("Connect Provider");
      await page.getByRole("tab", { name: "Provider" }).click({ force: true });
      await expect(
        page.locator(`input[value="${providerName}"]`),
      ).toBeVisible();
      // The key matters most: the API never returns one, so a form that lost
      // it leaves the operator with nothing to correct.
      await expect(
        page.locator('input[value="sk-e2e-refused-key"]'),
      ).toBeVisible();
    } finally {
      await close();
    }
  });
});
