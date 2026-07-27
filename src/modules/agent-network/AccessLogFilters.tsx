"use client";

import {
  DatePickerWithRange,
  dateRangePresetLabel,
} from "@components/DatePickerWithRange";
import {
  CheckboxListPicker,
  formatCheckboxChip,
} from "@components/table/filters/CheckboxListPicker";
import {
  formatGroupsChip,
  GroupsPicker,
} from "@components/table/filters/GroupsPicker";
import {
  formatUsersChip,
  UserOption,
  UsersPicker,
} from "@components/table/filters/UsersPicker";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import { ColumnFiltersState, Table } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { useGroups } from "@/contexts/GroupsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";

type FilterRow = Record<string, unknown>;

// formatDateChip renders the active date-range filter as a compact chip body.
// Quick-range presets (Last 14 Days, Last Month, …) show their label; a custom
// range shows the compact "from – to" span.
export function formatDateChip(
  value: DateRange | undefined,
  translate?: (key: string) => string,
): string | null {
  if (!value?.from && !value?.to) return null;
  const preset = dateRangePresetLabel(value, translate);
  if (preset) return preset;
  const from = value?.from ? dayjs(value.from).format("MMM D") : "…";
  const to = value?.to ? dayjs(value.to).format("MMM D") : "…";
  return `${from} – ${to}`;
}

// useAccessLogFilters builds the shared Date / User / Group / Provider / Model
// filter controls (same UX as the Peers views). It returns the raw
// columnFilters state (so callers can translate it into server-side query
// params) plus the Filters button and chips for a standalone bar. The Date
// filter defaults to the last 14 days; resetting returns to that default.
export function useAccessLogFilters() {
  const tDateRange = useTranslations("dateRange");
  const { providers } = useAIProviders();
  const { users } = useUsers();
  const { groups } = useGroups();

  // 14-day default window, computed once so it's stable across renders.
  const defaultDateRange = useMemo<DateRange>(
    () => ({
      from: dayjs().subtract(14, "day").startOf("day").toDate(),
      to: dayjs().endOf("day").toDate(),
    }),
    [],
  );

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => [
    { id: "date", value: defaultDateRange },
  ]);

  // TableFiltersButton / TableFilterChips / DataTableResetFilterButton only read
  // getColumn().getFilterValue()/setFilterValue(), getState() and setPageIndex(),
  // so we back them with a minimal adapter over columnFilters state instead of a
  // full TanStack table (which would require the repo's augmented filter fns).
  const filterTable = useMemo(() => {
    const adapter = {
      setPageIndex: () => undefined,
      getState: () => ({ globalFilter: "", columnFilters }),
      getColumn: (id: string) => ({
        getFilterValue: () => columnFilters.find((f) => f.id === id)?.value,
        setFilterValue: (next: unknown) =>
          setColumnFilters((prev) => {
            const rest = prev.filter((f) => f.id !== id);
            const isEmpty =
              next == null || (Array.isArray(next) && next.length === 0);
            return isEmpty ? rest : [...rest, { id, value: next }];
          }),
      }),
    };
    return adapter as unknown as Table<FilterRow>;
  }, [columnFilters]);

  const userOptions = useMemo<UserOption[]>(
    () =>
      (users ?? [])
        .filter((u) => u.email)
        .map((u) => ({
          id: u.id,
          name: u.name || u.email || "",
          email: u.email || "",
        })),
    [users],
  );
  const providerOptions = useMemo(
    () => (providers ?? []).map((p) => ({ value: p.id, label: p.name })),
    [providers],
  );
  // Model options come from the configured providers (a stable catalog) rather
  // than the fetched rows, so the dropdown lists every model regardless of what
  // the current server page returned.
  const modelOptions = useMemo(() => {
    const models = new Set<string>();
    (providers ?? []).forEach((p) =>
      (p.models ?? []).forEach((m) => m.id && models.add(m.id)),
    );
    return Array.from(models)
      .sort()
      .map((m) => ({ value: m, label: m }));
  }, [providers]);

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "date",
        label: "Date",
        renderPicker: (p) => (
          <div className={"p-1"}>
            <DatePickerWithRange
              value={p.value as DateRange | undefined}
              onChange={(range) => p.onChange(range)}
            />
          </div>
        ),
        formatChip: (v) =>
          formatDateChip(v as DateRange | undefined, tDateRange),
      },
      {
        id: "user",
        label: "User",
        renderPicker: (p) => (
          <UsersPicker
            value={p.value as string | undefined}
            onChange={p.onChange}
            close={p.close}
            options={userOptions}
          />
        ),
        formatChip: (v) =>
          formatUsersChip(v as string | undefined, userOptions),
      },
      {
        id: "group",
        label: "Group",
        renderPicker: (p) => (
          <GroupsPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            groups={groups}
          />
        ),
        formatChip: (v) => formatGroupsChip(v as string[] | undefined),
      },
      {
        id: "provider",
        label: "Provider",
        renderPicker: (p) => (
          <CheckboxListPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            options={providerOptions}
          />
        ),
        formatChip: (v) =>
          formatCheckboxChip(
            v as string[] | undefined,
            providerOptions,
            "providers",
          ),
      },
      {
        id: "model",
        label: "Model",
        renderPicker: (p) => (
          <CheckboxListPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            options={modelOptions}
          />
        ),
        formatChip: (v) =>
          formatCheckboxChip(v as string[] | undefined, modelOptions, "models"),
      },
    ],
    [groups, modelOptions, providerOptions, tDateRange, userOptions],
  );

  const filtersButton = (
    <TableFiltersButton table={filterTable} filters={filterDefs} />
  );

  const filterChips = (
    <TableFilterChips table={filterTable} filters={filterDefs} />
  );

  // The default 14-day window shows as an active chip but isn't a "change" —
  // so the reset appears once the user picks a different range or adds another
  // filter, matching the Access Log table's behavior.
  const isDefaultDate = (v: DateRange | undefined) =>
    !!v &&
    v.from?.getTime() === defaultDateRange.from?.getTime() &&
    v.to?.getTime() === defaultDateRange.to?.getTime();
  const hasFilters = columnFilters.some(
    (f) => f.id !== "date" || !isDefaultDate(f.value as DateRange | undefined),
  );

  // Reset returns to the default (last 14 days), clearing any other filters.
  const resetFilters = () =>
    setColumnFilters([{ id: "date", value: defaultDateRange }]);

  // The standard reset button — same component the Peers / Access Log tables
  // use. hasServerSideFilters drives visibility so it shows exactly when the
  // filters differ from the default.
  const resetButton = (
    <DataTableResetFilterButton
      table={filterTable}
      onClick={resetFilters}
      hasServerSideFilters={hasFilters}
    />
  );

  return {
    columnFilters,
    resetButton,
    filtersButton,
    filterChips,
    hasFilters,
    resetFilters,
  };
}
