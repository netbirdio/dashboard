/**
 * Agent Network prompt-cache accounting spec.
 *
 * Drives the Usage & Logs page against mocked agent-network endpoints whose
 * rows carry the cache fields (cached_input_tokens / cache_creation_tokens /
 * cache_cost_usd) plus the per-bucket cost breakdown, and verifies the hover
 * breakdowns: the access-log Tokens tooltip gains cache read/write rows and a
 * cache-aware total, the Cost tooltip lists one line per billed bucket, and
 * the usage overview's daily table
 * surfaces the day's cache buckets. Route mocks keep the spec hermetic, so it
 * passes against management builds that predate the cache fields.
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { loginToApp, navigateTo } from "../helpers/auth";

const AGENT_NETWORK_CONFIG_KEY = "netbird-test-agent-network";

// The reported field scenario: a session-start request that wrote a ~32k-token
// prompt cache, and a follow-up that read it back.
const writeEntry = {
  id: "anlog-cache-write",
  service_id: "svc-e2e",
  timestamp: new Date().toISOString(),
  status_code: 200,
  duration_ms: 29000,
  input_tokens: 10,
  output_tokens: 1472,
  total_tokens: 33591,
  cached_input_tokens: 0,
  cache_creation_tokens: 32109,
  cost_usd: 0.142519,
  cache_cost_usd: 0.120409,
  input_cost_usd: 0.00003,
  cached_input_cost_usd: 0,
  cache_creation_cost_usd: 0.120409,
  output_cost_usd: 0.02208,
  provider: "bedrock",
  model: "anthropic.claude-sonnet-4-5",
  session_id: "sess-cache-write",
  decision: "allow",
  stream: false,
};

const readEntry = {
  ...writeEntry,
  id: "anlog-cache-read",
  output_tokens: 800,
  total_tokens: 32919,
  cached_input_tokens: 32109,
  cache_creation_tokens: 0,
  cost_usd: 0.021663,
  cache_cost_usd: 0.009633,
  input_cost_usd: 0.00003,
  cached_input_cost_usd: 0.009633,
  cache_creation_cost_usd: 0,
  output_cost_usd: 0.012,
  session_id: "sess-cache-read",
};

const todayBucket = {
  period_start: new Date().toISOString().slice(0, 10),
  input_tokens: 20,
  output_tokens: 2272,
  total_tokens: 66510,
  cached_input_tokens: 32109,
  cache_creation_tokens: 32109,
  cost_usd: 0.164182,
  cache_cost_usd: 0.130042,
  input_cost_usd: 0.00006,
  cached_input_cost_usd: 0.009633,
  cache_creation_cost_usd: 0.120409,
  output_cost_usd: 0.03408,
};

async function mockCacheUsage(page: Page) {
  await page.route("**/api/agent-network/access-logs*", (route) =>
    route.fulfill({
      json: {
        data: [writeEntry, readEntry],
        page: 1,
        page_size: 25,
        total_records: 2,
        total_pages: 1,
      },
    }),
  );
  await page.route("**/api/agent-network/usage/overview*", (route) =>
    route.fulfill({ json: [todayBucket] }),
  );
}

async function newUsagePage(browser: Browser): Promise<{
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
  await mockCacheUsage(page);
  await loginToApp(page, "owner");
  return { page, close: () => context.close() };
}

// FullTooltip force-mounts its content, so a tooltip keeps its role=tooltip
// element in the DOM after closing — a bare getByRole("tooltip") accumulates
// every tooltip the test has ever opened. Radix puts role=tooltip on a
// visually-hidden span and the open/closed flag on that span's parent
// ("delayed-open"/"instant-open" vs "closed"), so match the parent that is
// currently open. Its text covers both the visible copy and the hidden one.
function tooltip(page: Page) {
  return page.locator(
    '[data-state="delayed-open"]:has(> [role="tooltip"]), [data-state="instant-open"]:has(> [role="tooltip"])',
  );
}

// Radix's hoverable content holds a tooltip open while the pointer travels
// toward it, so moving straight to the next cell can leave two open at once.
// Escape dismisses the open one deterministically, wherever the pointer sits.
async function closeTooltip(page: Page) {
  await page.keyboard.press("Escape");
  await expect(tooltip(page)).toHaveCount(0);
}

test.describe.serial("Agent Network cache accounting @agent-network", () => {
  test("access-log hover breaks out prompt-cache tokens and cost", async ({
    browser,
  }) => {
    const { page, close } = await newUsagePage(browser);
    try {
      await navigateTo(page, "/agent-network/usage?tab=access-logs");

      const writeRow = page.getByRole("row").filter({ hasText: "$0.1425" });
      await expect(writeRow).toBeVisible();

      // Tokens tooltip: cache-write bucket plus a total that includes it.
      await writeRow.getByText("1,472").hover();
      await expect(tooltip(page)).toContainText("32,109");
      await expect(tooltip(page)).toContainText("cache write");
      await expect(tooltip(page)).toContainText("33,591");

      // Cost tooltip: all four buckets are listed plus the total, including
      // buckets that cost nothing — this request wrote the cache but never read
      // it, so "cache read" is present with a $0.0000 amount.
      await closeTooltip(page);
      await writeRow.getByText("$0.1425").hover();
      await expect(tooltip(page)).toContainText("input");
      await expect(tooltip(page)).toContainText("cache read");
      await expect(tooltip(page)).toContainText("cache write");
      await expect(tooltip(page)).toContainText("output");
      await expect(tooltip(page)).toContainText("$0.1204");
      await expect(tooltip(page)).toContainText("$0.0221");
      await expect(tooltip(page)).toContainText("$0.0000");
      await expect(tooltip(page)).toContainText("total");

      // The follow-up request reads the cache back: read bucket filled, write
      // bucket still listed as a zero row.
      // No exact match: the output count renders behind an sr-only "Output:" prefix.
      const readRow = page.getByRole("row").filter({ hasText: "$0.0217" });
      await closeTooltip(page);
      await readRow.getByText("800").hover();
      await expect(tooltip(page)).toContainText("cache read");
      await expect(tooltip(page)).toContainText("32,919");
      await expect(tooltip(page)).toContainText(/0\s*cache write/);
    } finally {
      await close();
    }
  });

  test("usage overview daily table surfaces the day's cache buckets", async ({
    browser,
  }) => {
    const { page, close } = await newUsagePage(browser);
    try {
      await navigateTo(page, "/agent-network/usage");

      // Row-scoped on purpose: the hovers now repeat the cell's own figure on
      // their total row, and FullTooltip force-mounts that content, so a
      // page-wide getByText would match the cell and the tooltip both. Radix
      // portals tooltip content to <body>, outside the row.
      const dayRow = page.getByRole("row").filter({ hasText: "$0.16" });

      // Total Tokens includes the additive cache buckets; hover splits them out
      // in the same value-then-label rows the access-log table uses.
      await expect(dayRow.getByText("66,510")).toBeVisible();
      await dayRow.getByText("66,510").hover();
      await expect(tooltip(page)).toContainText(/20\s*input/);
      await expect(tooltip(page)).toContainText(/2,272\s*output/);
      await expect(tooltip(page)).toContainText(/32,109\s*cache read/);
      await expect(tooltip(page)).toContainText(/32,109\s*cache write/);
      await expect(tooltip(page)).toContainText(/66,510\s*total/);

      // Cost hover breaks the day into the same four billed buckets.
      await closeTooltip(page);
      await dayRow.getByText("$0.16", { exact: true }).hover();
      await expect(tooltip(page)).toContainText(/\$0\.0001\s*input/);
      await expect(tooltip(page)).toContainText(/\$0\.0341\s*output/);
      await expect(tooltip(page)).toContainText(/\$0\.0096\s*cache read/);
      await expect(tooltip(page)).toContainText(/\$0\.1204\s*cache write/);
      await expect(tooltip(page)).toContainText(/\$0\.1642\s*total/);
    } finally {
      await close();
    }
  });
});
