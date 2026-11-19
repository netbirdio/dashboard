import { navigateTo } from "../helpers/auth";
import { expect, test } from "../helpers/fixtures";

test("switches the dashboard language and remembers the preference", async ({
  dashboardAsOwner: page,
}) => {
  await navigateTo(page, "/groups");
  try {
    await page.getByRole("button", { name: "Interface language" }).click();
    await page.getByRole("menuitemradio", { name: "简体中文" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
    await expect(
      page.getByRole("heading", { name: /分组/ }).first(),
    ).toBeVisible();

    await expect(page.getByPlaceholder("按分组名称搜索…")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "名称" }),
    ).toBeVisible();
    await page.getByTestId("table-filters-button").click();
    await page.getByTestId("table-filter-in_use").click();
    await page.getByTestId("radio-option-used").click();
    await expect(
      page.getByRole("button", { name: /使用情况：.*使用中/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "界面语言" }).click();
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(
      page.getByRole("button", { name: "Usage: Used" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Remove Usage filter" }).click();
    await page.getByRole("button", { name: "Interface language" }).click();
    await page.getByRole("menuitemradio", { name: "简体中文" }).click();

    await page.reload();
    await expect(page.getByRole("button", { name: "界面语言" })).toBeVisible();
    await page.getByRole("button", { name: "界面语言" }).click();
    await expect(
      page.getByRole("menuitemradio", { name: "简体中文" }),
    ).toHaveAttribute("aria-checked", "true");

    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  } finally {
    await page.evaluate(() => localStorage.removeItem("netbird-locale"));
    await page.reload();
  }
});
