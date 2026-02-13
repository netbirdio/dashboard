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
import { usePathname } from "next/navigation";
import dayjs from "dayjs";
import React, { useCallback, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@components/DatePickerWithRange";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useServerPagination } from "@/contexts/ServerPaginationProvider";
import {
  REVERSE_PROXY_EVENTS_DOCS_LINK,
  ReverseProxyEvent,
} from "@/interfaces/ReverseProxy";
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

export const ReverseProxyEventsTableColumns: ColumnDef<ReverseProxyEvent>[] = [
  {
    id: "timestamp",
    header: ({ column }) => (
      <DataTableHeader column={column}>Time</DataTableHeader>
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
      <DataTableHeader column={column}>Location / IP</DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyEventsLocationIpCell event={row.original} />
    ),
  },
  {
    id: "method",
    accessorKey: "method",
    header: ({ column }) => (
      <DataTableHeader column={column}>Method</DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsMethodCell event={row.original} />,
    filterFn: "arrIncludesSomeExact",
  },
  {
    id: "url",
    accessorFn: (row) => `${row.host} ${row.path}`,
    header: ({ column }) => (
      <DataTableHeader column={column}>URL</DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsUrlCell event={row.original} />,
  },
  {
    id: "status",
    accessorKey: "status_code",
    header: ({ column }) => (
      <DataTableHeader column={column}>Status</DataTableHeader>
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
      <DataTableHeader column={column}>Duration</DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsDurationCell event={row.original} />,
  },
  {
    id: "auth_method",
    accessorKey: "auth_method_used",
    header: ({ column }) => (
      <DataTableHeader column={column}>Auth Method</DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyEventsAuthMethodCell event={row.original} />
    ),
  },
  {
    id: "reason",
    accessorKey: "reason",
    header: ({ column }) => (
      <DataTableHeader column={column}>Reason</DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsReasonCell event={row.original} />,
  },
  {
    id: "user",
    accessorFn: (row) => row.user_id || "",
    header: ({ column }) => (
      <DataTableHeader column={column}>User</DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsUserCell event={row.original} />,
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function ReverseProxyEventsTable({
  headingTarget,
}: Readonly<Props>) {
  const path = usePathname();

  const {
    data: events,
    isLoading,
    mutate,
    setFilter,
    getFilter,
    ...paginationProps
  } = useServerPagination<ReverseProxyEvent[]>();

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

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "timestamp",
        desc: true,
      },
    ],
  );

  return (
    <DataTable
      {...paginationProps}
      data={events}
      headingTarget={headingTarget}
      isLoading={isLoading}
      inset={false}
      tableCellClassName={"py-1 px-2"}
      text={"Proxy Events"}
      sorting={sorting}
      setSorting={setSorting}
      columns={ReverseProxyEventsTableColumns}
      columnVisibility={{ is_success: false }}
      searchPlaceholder={"Search by IP, host, path, user..."}
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
          title={"No Proxy Events Yet"}
          description={
            "We haven't detected any proxy events yet. This could be because you haven't configured any reverse proxy services, or there hasn't been any traffic."
          }
          learnMore={
            <>
              Learn more about
              <InlineLink
                href={REVERSE_PROXY_EVENTS_DOCS_LINK}
                target={"_blank"}
              >
                Proxy Events
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
    >
      {(table) => (
        <>
          <ButtonGroup disabled={!events?.length}>
            <ButtonGroup.Button
              onClick={() => setFilter("status", undefined)}
              disabled={!events?.length}
              variant={activeStatus === undefined ? "tertiary" : "secondary"}
            >
              All
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => setFilter("status", "success")}
              disabled={!events?.length}
              variant={activeStatus === "success" ? "tertiary" : "secondary"}
            >
              Success
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => setFilter("status", "failed")}
              disabled={!events?.length}
              variant={activeStatus === "failed" ? "tertiary" : "secondary"}
            >
              Failed
            </ButtonGroup.Button>
          </ButtonGroup>

          <DatePickerWithRange
            value={dateRange}
            onChange={handleDateFilterChange}
            disabled={!events?.length}
          />

          <DataTableRowsPerPage table={table} disabled={!events?.length} />

          <DataTableRefreshButton
            isDisabled={!events?.length}
            onClick={() => mutate()}
          />
        </>
      )}
    </DataTable>
  );
}
