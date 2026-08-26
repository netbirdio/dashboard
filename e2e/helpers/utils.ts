import type { Page, Request } from "@playwright/test";

export function generateRandomName(prefix?: string): string {
  return (prefix || "") + Math.random().toString(36).substring(7);
}

/**
 * Run an action (click, goto, ...) and wait until every API request whose
 * URL contains `pattern` has finished (response received or failed), plus a
 * short quiet window to catch request chains where one response triggers
 * the next fetch.
 *
 * Use this to make navigation deterministic: e.g. when opening the services
 * page, the table only renders fully after /api/reverse-proxies/* calls
 * return, so asserting on rows right after the click races the backend.
 *
 * Returns whatever the action returns.
 */
export async function waitForApiCalls<T>(
  page: Page,
  action: () => Promise<T>,
  {
    pattern = "/api/reverse-prox",
    quietMs = 500,
    timeoutMs = 15_000,
  }: { pattern?: string; quietMs?: number; timeoutMs?: number } = {},
): Promise<T> {
  let inFlight = 0;
  let sawRequest = false;
  let lastActivity = Date.now();

  const matches = (req: Request) => req.url().includes(pattern);
  const onRequest = (req: Request) => {
    if (!matches(req)) return;
    inFlight++;
    sawRequest = true;
    lastActivity = Date.now();
  };
  const onSettled = (req: Request) => {
    if (!matches(req)) return;
    inFlight = Math.max(0, inFlight - 1);
    lastActivity = Date.now();
  };

  page.on("request", onRequest);
  page.on("requestfinished", onSettled);
  page.on("requestfailed", onSettled);

  try {
    const result = await action();
    const deadline = Date.now() + timeoutMs;
    // Wait until: at least one matching request was seen (unless none ever
    // fires), none are in flight, and the network has been quiet for quietMs.
    while (Date.now() < deadline) {
      const quietFor = Date.now() - lastActivity;
      if (inFlight === 0 && quietFor >= quietMs) {
        if (sawRequest || quietFor >= quietMs * 2) break;
      }
      await page.waitForTimeout(100);
    }
    return result;
  } finally {
    page.off("request", onRequest);
    page.off("requestfinished", onSettled);
    page.off("requestfailed", onSettled);
  }
}

/**
 * Apply a single-choice (radio) table filter via the new TableFilters UI:
 * open the "Filters" popover, pick the filter by column id, then select the
 * option by its visible label (e.g. "Active", "Inactive", "All").
 */
export async function applyRadioTableFilter(
  page: Page,
  filterId: string,
  optionLabel: string,
) {
  await page.getByTestId("table-filters-button").click();
  await page.getByTestId(`table-filter-${filterId}`).click();
  const optionId = `radio-option-${optionLabel
    .replace(/\s+/g, "-")
    .toLowerCase()}`;
  await page.getByTestId(optionId).click();
}

/**
 * Clear stale Radix scroll-lock and overlay from body.
 * Some Radix modals leave `data-scroll-locked`, `pointer-events: none`,
 * or a stale overlay div blocking the entire page.
 */
export async function clearScrollLock(page: Page) {
  await page.evaluate(() => {
    document.body.removeAttribute("data-scroll-locked");
    document.body.style.removeProperty("pointer-events");
    // Remove stale Radix dialog overlays that block pointer events
    document
      .querySelectorAll(
        'div[data-state="open"].fixed[class*="backdrop-blur"]',
      )
      .forEach((el) => el.remove());
  });
}
