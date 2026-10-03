import { TableFilterChips } from "@components/table/TableFilters";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import {
  createTable,
  filterFns,
  getCoreRowModel,
  sortingFns,
} from "@tanstack/react-table";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, expect, it } from "vitest";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import { createI18n } from "./config";

dayjs.extend(relativeTime);
afterEach(cleanup);

async function localized(ui: React.ReactNode, language: string) {
  const i18n = createI18n();
  await i18n.changeLanguage(language);
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

it("lets Japanese place the page name before the access-denied message", async () => {
  await localized(<RestrictedAccess page="DNS" />, "ja");
  expect(screen.getByRole("heading").textContent).toBe(
    "「DNS」へのアクセス権がありません",
  );
});

it("uses a complete access-denied sentence when no page is supplied", async () => {
  await localized(<RestrictedAccess />, "ru");
  expect(screen.getByRole("heading").textContent).toBe(
    "У вас нет доступа к этой странице",
  );
});

it("preserves the English heading and does not interpret page names as markup", async () => {
  await localized(<RestrictedAccess page="<em>DNS</em>" />, "en");
  const heading = screen.getByRole("heading");
  expect(heading.textContent).toBe("You don't have access to <em>DNS</em>");
  expect(heading.querySelector("em")).toBeNull();
});

it.each([
  ["Last used on", "Последнее использование"],
  ["Last login on", "Последний вход"],
])("translates the supplied %s tooltip label", async (text, expected) => {
  await localized(<LastTimeRow date={new Date()} text={text} />, "ru");
  fireEvent.focus(screen.getByRole("button"));
  const tooltip = await screen.findByRole("tooltip");
  expect(tooltip.textContent).toContain(expected);
  expect(tooltip.textContent).not.toContain(text);
});

it("announces filter removal in Russian and still removes the filter", async () => {
  const table = createTable({
    data: [{ name: "server" }],
    columns: [{ accessorKey: "name" }],
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualSorting: true,
    filterFns: {
      fuzzy: filterFns.includesString,
      exactMatch: filterFns.equalsString,
      arrIncludesSomeExact: filterFns.arrIncludesSome,
      dateRange: filterFns.inNumberRange,
    },
    sortingFns: { checkbox: sortingFns.basic, datetime: sortingFns.datetime },
    state: {
      columnFilters: [{ id: "name", value: "server" }],
      pagination: { pageIndex: 2, pageSize: 10 },
    },
    renderFallbackValue: null,
    onStateChange: (updater) => {
      table.setOptions((options) => ({
        ...options,
        state:
          typeof updater === "function" ? updater(table.getState()) : updater,
      }));
    },
  });
  await localized(
    <TableFilterChips
      table={table}
      filters={[
        {
          id: "name",
          label: "Название",
          renderPicker: () => null,
          formatChip: (value) => (typeof value === "string" ? value : null),
        },
      ]}
    />,
    "ru",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Удалить фильтр «Название»" }),
  );
  expect(table.getState().columnFilters).toEqual([]);
  expect(table.getState().pagination.pageIndex).toBe(0);
});
