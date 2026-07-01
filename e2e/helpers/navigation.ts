import type { Page } from "@playwright/test";

export async function visitByNavigation(page: Page, navText: string) {
  await page
    .getByTestId("left-navigation-item")
    .getByText(navText, { exact: true })
    .click();
}
