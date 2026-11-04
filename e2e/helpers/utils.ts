import type { Page, Request } from "@playwright/test";

export function generateRandomName(prefix?: string): string {
  return (prefix || "") + Math.random().toString(36).substring(7);
}

/**
 * Run an action and wait until every request matching `pattern` has settled,
 * plus a quiet window to catch chains where one response triggers the next.
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
 * Call before navigating. The override persists for the whole browser context
 * and the page is shared per worker, so edition-dependent specs must set it.
 */
export async function setTestEdition(
  page: Page,
  edition: "cloud" | "licensed" | "oss",
) {
  await page.evaluate((ed) => {
    try {
      window.localStorage.setItem("netbird-test-edition", ed);
    } catch (e) {
      /* storage unavailable */
    }
  }, edition);
}

/**
 * Some Radix modals leave scroll-lock, `pointer-events: none` or a stale
 * overlay div behind, blocking the entire page.
 */
export async function clearScrollLock(page: Page) {
  await page.evaluate(() => {
    document.body.removeAttribute("data-scroll-locked");
    document.body.style.removeProperty("pointer-events");
    document
      .querySelectorAll('div[data-state="open"].fixed[class*="backdrop-blur"]')
      .forEach((el) => el.remove());
  });
}
