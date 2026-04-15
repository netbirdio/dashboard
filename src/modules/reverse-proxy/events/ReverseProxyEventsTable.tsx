"use client";

import ButtonGroup from "@components/ButtonGroup";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon } from "lucide-react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import dayjs from "dayjs";
import React, { useCallback, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@components/DatePickerWithRange";
import { useServerPagination } from "@/contexts/ServerPaginationProvider";
import {
  REVERSE_PROXY_EVENTS_DOCS_LINK,
  ReverseProxy,
  ReverseProxyEvent,
} from "@/interfaces/ReverseProxy";
import useFetchApi from "@/utils/api";
import { ReverseProxyEventsStatusCell } from "@/modules/reverse-proxy/events/ReverseProxyEventsStatusCell";
import { ReverseProxyEventsUserCell } from "@/modules/reverse-proxy/events/ReverseProxyEventsUserCell";
import { ReverseProxyEventsLocationIpCell } from "@/modules/reverse-proxy/events/ReverseProxyEventsLocationIpCell";
import {
  ReverseProxyEventsMethodCell,
  ReverseProxyEventsUrlCell,
} from "@/modules/reverse-proxy/events/ReverseProxyEventsRequestCell";
import { ReverseProxyEventsTimeCell } from "@/modules/reverse-proxy/events/ReverseProxyEventsTimeCell";
import { ReverseProxyEventsAuthMethodCell } from "@/modules/reverse-proxy/events/ReverseProxyEventsAuthMethodCell";
import { ReverseProxyEventsReasonCell } from "@/modules/reverse-proxy/events/ReverseProxyEventsReasonCell";
import { ReverseProxyEventsDurationCell } from "@/modules/reverse-proxy/events/ReverseProxyEventsDurationCell";
import { ReverseProxyEventsBytesCell } from "@/modules/reverse-proxy/events/ReverseProxyEventsBytesCell";
import { useI18n } from "@/i18n/I18nProvider";
import type { MessageKey } from "@/i18n/messages";

type TranslationValues = Record<string, string | number>;

export const makeEventsColumns = (
  servicesMap: Map<string, ReverseProxy>,
  t: (key: MessageKey, values?: TranslationValues) => string,
): ColumnDef<ReverseProxyEvent>[] => [
  {
    id: "timestamp",
    header: ({ column }) => (
      <DataTableHeader column={column} name="timestamp">
        {t("proxyEvents.time")}
      </DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyEventsTimeCell timestamp={row.original.timestamp} />
    ),
    accessorFn: (row) => row.timestamp,
    filterFn: "dateRange",
    enableGlobalFilter: false,
  },
  {
    id: "location_ip",
    accessorFn: (row) =>
      `${row.source_ip} ${row.city_name || ""} ${row.country_code || ""}`,
    header: ({ column }) => (
      <DataTableHeader column={column} name="source_ip">
        {t("proxyEvents.locationIp")}
      </DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyEventsLocationIpCell event={row.original} />
    ),
  },
  {
    id: "method",
    accessorKey: "method",
    header: ({ column }) => (
      <DataTableHeader column={column} name="method">
        {t("proxyEvents.method")}
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsMethodCell event={row.original} />,
    filterFn: "arrIncludesSomeExact",
  },
  {
    id: "url",
    accessorFn: (row) => `${row.host} ${row.path || ""}`,
    header: ({ column }) => (
      <DataTableHeader column={column} name="url" sorting={false}>
        {t("proxyEvents.hostUrl")}
      </DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyEventsUrlCell
        event={row.original}
        service={servicesMap.get(row.original.service_id)}
      />
    ),
  },
  {
    id: "status",
    accessorKey: "status_code",
    header: ({ column }) => (
      <DataTableHeader column={column} name="status_code">
        {t("table.status")}
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsStatusCell event={row.original} />,
    size: 80,
    maxSize: 80,
  },
  {
    id: "is_success",
    accessorFn: (row) => row.status_code >= 200 && row.status_code < 400,
    filterFn: "exactMatch",
  },
  {
    id: "duration",
    accessorKey: "duration_ms",
    header: ({ column }) => (
      <DataTableHeader column={column} name="duration">
        {t("proxyEvents.duration")}
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsDurationCell event={row.original} />,
  },
  {
    id: "bytes",
    accessorFn: (row) => (row.bytes_download ?? 0) + (row.bytes_upload ?? 0),
    header: ({ column }) => (
      <DataTableHeader column={column} sorting={false}>
        {t("proxyEvents.bytes")}
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsBytesCell event={row.original} />,
  },
  {
    id: "auth_method",
    accessorKey: "auth_method_used",
    header: ({ column }) => (
      <DataTableHeader column={column} name="auth_method">
        {t("proxyEvents.authMethod")}
      </DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyEventsAuthMethodCell event={row.original} />
    ),
  },
  {
    id: "reason",
    accessorKey: "reason",
    header: ({ column }) => (
      <DataTableHeader column={column} name="reason">
        {t("proxyEvents.reason")}
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsReasonCell event={row.original} />,
  },
  {
    id: "user",
    accessorFn: (row) => row.user_id || "",
    header: ({ column }) => (
      <DataTableHeader column={column} name="user_id">
        {t("table.user")}
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsUserCell event={row.original} />,
  },
  {
    accessorKey: "id",
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function ReverseProxyEventsTable({
  headingTarget,
}: Readonly<Props>) {
  const { t } = useI18n();
  const {
    data: events,
    isLoading,
    mutate,
    setFilter,
    getFilter,
    hasActiveFilters,
    ...paginationProps
  } = useServerPagination<ReverseProxyEvent[]>();

  const { data: services } = useFetchApi<ReverseProxy[]>(
    "/reverse-proxies/services",
  );

  const servicesMap = useMemo(() => {
    const map = new Map<string, ReverseProxy>();
    for (const svc of services ?? []) {
      if (svc.id) map.set(svc.id, svc);
    }
    return map;
  }, [services]);

  const columns = useMemo(() => makeEventsColumns(servicesMap, t), [servicesMap, t]);

  const activeStatus = getFilter("status");

  const dateRange = useMemo<DateRange | undefined>(() => {
    const startDate = getFilter("start_date");
    const endDate = getFilter("end_date");
    if (!startDate && !endDate) return undefined;
    return {
      from: startDate ? dayjs(startDate).toDate() : undefined,
      to: endDate ? dayjs(endDate).toDate() : undefined,
    };
  }, [getFilter]);

  const handleDateFilterChange = useCallback(
    (range?: DateRange) => {
      setFilter(
        "start_date",
        range?.from ? dayjs(range.from).toISOString() : undefined,
      );
      setFilter(
        "end_date",
        range?.to ? dayjs(range.to).toISOString() : undefined,
      );
    },
    [setFilter],
  );

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "timestamp",
      desc: true,
    },
  ]);

  return (
    <DataTable
      {...paginationProps}
      data={events}
      headingTarget={headingTarget}
      isLoading={isLoading}
      inset={false}
      tableCellClassName={"py-1 px-2"}
      text={t("proxyEvents.title")}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      columnVisibility={{ is_success: false, id: false }}
      searchPlaceholder={t("proxyEvents.searchPlaceholder")}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={
                <ReverseProxyIcon className={"fill-nb-gray-200"} size={20} />
              }
              color={"gray"}
              size={"large"}
            />
          }
          title={t("proxyEvents.emptyTitle")}
          description={t("proxyEvents.emptyDescription")}
          learnMore={
            <>
              {t("common.learnMorePrefix")}{" "}
              <InlineLink
                href={REVERSE_PROXY_EVENTS_DOCS_LINK}
                target={"_blank"}
              >
                {t("proxyEvents.title")}
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
    >
      {(table) => (
        <>
          <ButtonGroup disabled={!events?.length && !hasActiveFilters}>
            <ButtonGroup.Button
              onClick={() => setFilter("status", undefined)}
              variant={activeStatus === undefined ? "tertiary" : "secondary"}
            >
              {t("filters.all")}
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => setFilter("status", "success")}
              variant={activeStatus === "success" ? "tertiary" : "secondary"}
            >
              {t("proxyEvents.success")}
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => setFilter("status", "failed")}
              variant={activeStatus === "failed" ? "tertiary" : "secondary"}
            >
              {t("proxyEvents.failed")}
            </ButtonGroup.Button>
          </ButtonGroup>

          <DatePickerWithRange
            value={dateRange}
            onChange={handleDateFilterChange}
            disabled={!events?.length && !hasActiveFilters}
          />

          <DataTableRowsPerPage
            table={table}
            disabled={!events?.length && !hasActiveFilters}
          />

          <DataTableRefreshButton
            isDisabled={!events?.length && !hasActiveFilters}
            onClick={() => mutate()}
          />
        </>
      )}
    </DataTable>
  );
}
