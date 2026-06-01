"use client";

import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  formatRadioChip,
  RadioOption,
  RadioPicker,
} from "@components/table/filters/RadioPicker";
import {
  formatTextChip,
  TextInputPicker,
} from "@components/table/filters/TextInputPicker";
import {
  formatUsersChip,
  UserOption,
  UsersPicker,
} from "@components/table/filters/UsersPicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import GetStartedTest from "@components/ui/GetStartedTest";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon } from "lucide-react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import dayjs from "dayjs";
import React, { useCallback, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@components/DatePickerWithRange";
import { usePeers } from "@/contexts/PeersProvider";
import { useServerPagination } from "@/contexts/ServerPaginationProvider";
import { useUsers } from "@/contexts/UsersProvider";
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
import ReverseProxyEventExpandedRow from "@/modules/reverse-proxy/events/ReverseProxyEventExpandedRow";

export const makeEventsColumns = (
  servicesMap: Map<string, ReverseProxy>,
): ColumnDef<ReverseProxyEvent>[] => [
  {
    id: "timestamp",
    header: ({ column }) => (
      <DataTableHeader column={column} name="timestamp">
        Time
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
        Location / IP
      </DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyEventsLocationIpCell event={row.original} />
    ),
    filterFn: "includesString",
  },
  {
    id: "method",
    accessorKey: "method",
    header: ({ column }) => (
      <DataTableHeader column={column} name="method">
        Method
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsMethodCell event={row.original} />,
    filterFn: "exactMatch",
  },
  {
    id: "url",
    accessorFn: (row) => `${row.host} ${row.path || ""}`,
    header: ({ column }) => (
      <DataTableHeader column={column} name="url" sorting={false}>
        Host / URL
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
        Status
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
    id: "status_filter",
    accessorFn: (row) =>
      row.status_code >= 200 && row.status_code < 400 ? "success" : "failed",
    filterFn: "exactMatch",
  },
  {
    id: "duration",
    accessorKey: "duration_ms",
    header: ({ column }) => (
      <DataTableHeader column={column} name="duration">
        Duration
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsDurationCell event={row.original} />,
  },
  {
    id: "bytes",
    accessorFn: (row) => (row.bytes_download ?? 0) + (row.bytes_upload ?? 0),
    header: ({ column }) => (
      <DataTableHeader column={column} sorting={false}>
        Bytes
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsBytesCell event={row.original} />,
  },
  {
    id: "auth_method",
    accessorKey: "auth_method_used",
    header: ({ column }) => (
      <DataTableHeader column={column} name="auth_method">
        Auth Method
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
        Reason
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsReasonCell event={row.original} />,
  },
  {
    id: "user",
    accessorFn: (row) => row.user_id || "",
    header: ({ column }) => (
      <DataTableHeader column={column} name="user_id">
        User
      </DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyEventsUserCell event={row.original} />,
    filterFn: "exactMatch",
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
  const { users } = useUsers();
  const { peers } = usePeers();

  const servicesMap = useMemo(() => {
    const map = new Map<string, ReverseProxy>();
    for (const svc of services ?? []) {
      if (svc.id) map.set(svc.id, svc);
    }
    return map;
  }, [services]);

  const columns = useMemo(() => makeEventsColumns(servicesMap), [servicesMap]);

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

  const statusOptions = useMemo<RadioOption<string | undefined>[]>(
    () => [
      { value: undefined, label: "All", dotClass: "bg-nb-gray-500" },
      { value: "success", label: "Success", dotClass: "bg-green-500" },
      { value: "failed", label: "Failed", dotClass: "bg-red-500" },
    ],
    [],
  );

  const methodOptions = useMemo<RadioOption<string | undefined>[]>(
    () => [
      { value: undefined, label: "All" },
      { value: "GET", label: "GET" },
      { value: "POST", label: "POST" },
      { value: "PUT", label: "PUT" },
      { value: "PATCH", label: "PATCH" },
      { value: "DELETE", label: "DELETE" },
      { value: "HEAD", label: "HEAD" },
      { value: "OPTIONS", label: "OPTIONS" },
    ],
    [],
  );

  const userOptions = useMemo<UserOption[]>(() => {
    const map = new Map<string, UserOption>();
    for (const event of events ?? []) {
      const id = event.user_id;
      if (!id || map.has(id)) continue;
      const user = users?.find((u) => u.id === id);
      if (user) {
        map.set(id, {
          id: user.id,
          name: user.name || user.email || id,
          email: id,
        });
        continue;
      }
      const peer = peers?.find((p) => p.id === id);
      if (peer) {
        map.set(id, {
          id,
          name: peer.name || peer.hostname || id,
          email: id,
        });
        continue;
      }
      map.set(id, { id, name: id, email: id });
    }
    return Array.from(map.values());
  }, [events, users, peers]);

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "status_filter",
        label: "Status",
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as string | undefined}
            onChange={(next) => {
              p.onChange(next);
              setFilter("status", next ?? undefined);
            }}
            close={p.close}
            options={statusOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as string | undefined, statusOptions),
      },
      {
        id: "method",
        label: "Method",
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as string | undefined}
            onChange={(next) => {
              p.onChange(next);
              setFilter("method", next ?? undefined);
            }}
            close={p.close}
            options={methodOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as string | undefined, methodOptions),
      },
      {
        id: "user",
        label: "User",
        renderPicker: (p) => (
          <UsersPicker
            value={p.value as string | undefined}
            onChange={(next) => {
              p.onChange(next);
              setFilter("user_id", next ?? undefined);
            }}
            close={p.close}
            options={userOptions}
          />
        ),
        formatChip: (v) =>
          formatUsersChip(v as string | undefined, userOptions),
      },
      {
        id: "location_ip",
        label: "Location / IP",
        renderPicker: (p) => (
          <TextInputPicker
            value={p.value as string | undefined}
            onChange={(next) => {
              const trimmed = next?.trim() ?? "";
              p.onChange(trimmed ? trimmed : undefined);
              setFilter("source_ip", trimmed ? trimmed : undefined);
            }}
            close={p.close}
            placeholder={"e.g. 10.0.0.5 or Berlin"}
          />
        ),
        formatChip: (v) => formatTextChip(v as string | undefined),
      },
    ],
    [statusOptions, methodOptions, userOptions, setFilter],
  );

  const initialColumnFilters = useMemo(() => {
    const filters: { id: string; value: unknown }[] = [];
    if (activeStatus) {
      filters.push({ id: "status_filter", value: activeStatus });
    }
    const activeMethod = getFilter("method");
    if (activeMethod) {
      filters.push({ id: "method", value: activeMethod });
    }
    const activeIp = getFilter("source_ip");
    if (activeIp) {
      filters.push({ id: "location_ip", value: activeIp });
    }
    const activeUser = getFilter("user_id");
    if (activeUser) {
      filters.push({ id: "user", value: activeUser });
    }
    return filters;
  }, [activeStatus, getFilter]);

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
      columns={columns}
      initialFilters={initialColumnFilters}
      showResetFilterButton={false}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      columnVisibility={{
        is_success: false,
        id: false,
        status_filter: false,
      }}
      renderExpandedRow={(event) => (
        <ReverseProxyEventExpandedRow event={event} />
      )}
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
            "No proxy traffic yet. Events appear here once your reverse proxy services start serving requests."
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
          <DatePickerWithRange
            value={dateRange}
            onChange={handleDateFilterChange}
            disabled={!events?.length && !hasActiveFilters}
          />
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={!events?.length && !hasActiveFilters}
          />
          <DataTableResetFilterButton
            table={table}
            onClick={() => {
              table.setPageIndex(0);
              table.resetColumnFilters();
              table.resetGlobalFilter();
              setFilter("status", undefined);
              setFilter("start_date", undefined);
              setFilter("end_date", undefined);
              setFilter("method", undefined);
              setFilter("source_ip", undefined);
              setFilter("user_id", undefined);
            }}
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
