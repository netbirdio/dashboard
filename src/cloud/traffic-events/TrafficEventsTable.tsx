import Button from "@components/Button";
import { DatePickerWithRange } from "@components/DatePickerWithRange";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import NoResults from "@components/ui/NoResults";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import dayjs from "dayjs";
import { ArrowLeftRightIcon, ExternalLinkIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { useSWRConfig } from "swr";
import {
  getTrafficEventCounts,
  TrafficEvent,
  TrafficEventDirection,
  TrafficEventType,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { TrafficEventsBytesCell } from "@/cloud/traffic-events/table/TrafficEventsBytesCell";
import { TrafficEventsDetailRow } from "@/cloud/traffic-events/table/TrafficEventsDetailRow";
import { TrafficEventsMachineCell } from "@/cloud/traffic-events/table/TrafficEventsMachineCell";
import { TrafficEventsPortCell } from "@/cloud/traffic-events/table/TrafficEventsPortCell";
import { TrafficEventsReporterCell } from "@/cloud/traffic-events/table/TrafficEventsReporterCell";
import { TrafficEventsTextCell } from "@/cloud/traffic-events/table/TrafficEventsTextCell";
import { TrafficEventsTimeCell } from "@/cloud/traffic-events/table/TrafficEventsTimeCell";
import { TrafficEventsConnectionTypeFilter } from "@/cloud/traffic-events/TrafficEventsConnectionTypeFilter";
import { TRAFFIC_EVENTS_DOC_LINK } from "@/cloud/traffic-events/TrafficEventSetting";
import { TrafficEventsFilter } from "@/cloud/traffic-events/TrafficEventsFilter";
import { parseAddressPort } from "@/cloud/traffic-events/utils/parseAddress";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  UsersDropdownSelector,
  UserSelectOption,
} from "@/modules/activity/UsersDropdownSelector";

export type TrafficEventsTableProps = {
  events?: TrafficEvent[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  isSettingEnabled: boolean;
  totalRecords?: number;
  totalPages?: number;
  onPaginationChange?: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  pagination?: { pageIndex: number; pageSize: number };
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  onDateFilterChange?: (from?: Date, to?: Date) => void;
  dateFrom?: string;
  dateTo?: string;
  filters?: {
    type?: string[];
    connection_type?: string;
    direction?: string[];
    protocol?: string[];
  };
  onFilterChange?: (filters: {
    type?: string[];
    connection_type?: string;
    direction?: string[];
    protocol?: string[];
  }) => void;
  users?: any[];
  userId?: string;
  onUserFilterChange?: (userId: string) => void;
  onResetAllFilters?: () => void;
  apiUrl?: string;
  connectionTypeFilter?: string;
  onConnectionTypeFilterChange?: (value: string) => void;
};

export const getTrafficEventTypeText = (
  t: TrafficEventType,
  isP2P: boolean,
  direction: TrafficEventDirection,
) => {
  const name = isP2P ? "P2P" : "Routed";
  const isInbound = direction === TrafficEventDirection.INGRESS;
  const directionText = isInbound ? "(inbound)" : "(outbound)";

  switch (t) {
    case TrafficEventType.CONNECTED:
      return `${name} connection started ${directionText}`;
    case TrafficEventType.BLOCKED:
      return `${name} connection blocked ${directionText}`;
    case TrafficEventType.STOPPED:
      return `${name} connection stopped ${directionText}`;
    default:
      return "Unknown";
  }
};

export const TrafficEventsTableColumns: ColumnDef<TrafficEvent>[] = [
  {
    id: "timestamp",
    header: ({ column }) => (
      <DataTableHeader column={column}>Time</DataTableHeader>
    ),
    cell: ({ row }) => (
      <TrafficEventsTimeCell timestamp={row.original.events[0].timestamp} />
    ),
    accessorFn: (row) => row.events?.[0]?.timestamp ?? null,
    filterFn: "dateRange",
    enableGlobalFilter: false,
  },
  {
    id: "type",
    accessorKey: "type",
    accessorFn: (t) => {
      const isP2P =
        t.source.id === t.reporter_id || t.destination.id === t.reporter_id;
      return getTrafficEventTypeText(t.events[0].type, isP2P, t.direction);
    },
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Event</DataTableHeader>
    ),
    cell: ({ row }) => row.getValue("type"),
  },
  {
    id: "text",
    accessorKey: "type",
    accessorFn: (t) => {
      const isP2P =
        t.source.id === t.reporter_id || t.destination.id === t.reporter_id;
      return getTrafficEventTypeText(t.events[0].type, isP2P, t.direction);
    },
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Event</DataTableHeader>
    ),
    cell: ({ row }) => <TrafficEventsTextCell event={row.original} />,
    enableGlobalFilter: false,
  },
  {
    id: "source",
    accessorFn: (row) => row.source.address,
    header: ({ column }) => (
      <DataTableHeader column={column}>Source</DataTableHeader>
    ),
    cell: ({ row }) => (
      <TrafficEventsMachineCell event={row.original} isSource={true} />
    ),
  },
  {
    id: "protocol",
    accessorFn: (row) => row.protocol,
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Protocol & Port</DataTableHeader>
    ),
    cell: ({ row }) => <TrafficEventsPortCell event={row.original} />,
  },
  {
    id: "source_port",
    accessorFn: (row) => {
      return parseAddressPort(row?.source.address).port;
    },
    filterFn: "arrIncludesSomeExact",
  },
  {
    id: "destination_port",
    accessorFn: (row) => {
      return parseAddressPort(row?.destination.address).port;
    },
    filterFn: "arrIncludesSomeExact",
  },
  {
    id: "destination",
    accessorFn: (row) => row.destination.address,
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Destination</DataTableHeader>
    ),
    cell: ({ row }) => {
      return <TrafficEventsMachineCell event={row.original} isSource={false} />;
    },
  },

  {
    id: "bytes_all",
    accessorKey: "tx_bytes",
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Traffic</DataTableHeader>
    ),
    cell: ({ row }) => {
      return <TrafficEventsBytesCell event={row.original} />;
    },
    enableGlobalFilter: false,
  },
  {
    id: "bytes_inbound",
    accessorKey: "tx_bytes",
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Traffic</DataTableHeader>
    ),
    cell: ({ row }) => {
      return (
        <div className={"2xl:min-w-[200px] ml-auto"}>
          <TrafficEventsBytesCell event={row.original} showOutbound={false} />
        </div>
      );
    },
    enableGlobalFilter: false,
  },
  {
    id: "bytes_outbound",
    accessorKey: "tx_bytes",
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Traffic</DataTableHeader>
    ),
    cell: ({ row }) => {
      return (
        <div className={"2xl:min-w-[200px] ml-auto"}>
          <TrafficEventsBytesCell event={row.original} showInbound={false} />
        </div>
      );
    },
    enableGlobalFilter: false,
  },
  {
    id: "reporter",
    accessorKey: "reporter_id",
    header: ({ column }) => (
      <DataTableHeader column={column}>Router</DataTableHeader>
    ),
    cell: ({ row }) => <TrafficEventsReporterCell event={row.original} />,
  },
  {
    id: "policy",
    accessorFn: (row) => row.policy?.name,
  },
  {
    id: "user",
    accessorKey: "user_email",
  },
];

const defaultFromDate = dayjs().subtract(7, "day").startOf("day").toDate();
const defaultToDate = dayjs().endOf("day").toDate();

export default function TrafficEventsTable({
  events,
  isLoading,
  headingTarget,
  isSettingEnabled,
  totalRecords,
  totalPages,
  onPaginationChange,
  pagination,
  globalFilter,
  onGlobalFilterChange,
  onDateFilterChange,
  dateFrom,
  dateTo,
  filters,
  onFilterChange,
  users,
  userId,
  onUserFilterChange,
  onResetAllFilters,
  apiUrl,
  connectionTypeFilter,
  onConnectionTypeFilterChange,
}: Readonly<TrafficEventsTableProps>) {
  useFetchApi("/peers");
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const router = useRouter();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "timestamp",
        desc: true,
      },
    ],
  );

  const userSelectOptions = useMemo(() => {
    if (!users) return [];
    return users.map((user) => {
      return {
        id: user.id || "",
        name: user.name || "",
        email: user.email || "NetBird",
      } as UserSelectOption;
    });
  }, [users]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (dateFrom || dateTo) {
      return {
        from: dateFrom ? dayjs(dateFrom).toDate() : undefined,
        to: dateTo ? dayjs(dateTo).toDate() : undefined,
      };
    }
    return {
      from: defaultFromDate,
      to: defaultToDate,
    };
  });

  const handleDateFilterChange = useCallback(
    (range?: DateRange) => {
      setDateRange(range);
      if (range && onDateFilterChange) {
        onDateFilterChange(range.from, range.to);
      } else if (onDateFilterChange) {
        onDateFilterChange(undefined, undefined);
      }
    },
    [onDateFilterChange],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      if (onGlobalFilterChange) {
        onGlobalFilterChange(value);
      }
    },
    [onGlobalFilterChange],
  );

  const handleFilterChange = useCallback(
    (newFilters: {
      type?: string[];
      connection_type?: string;
      direction?: string[];
      protocol?: string[];
    }) => {
      if (onFilterChange) {
        onFilterChange(newFilters);
      }
    },
    [onFilterChange],
  );

  const handleUserFilterChange = useCallback(
    (selectedUserEmail: string | undefined) => {
      if (onUserFilterChange) {
        const selectedUser = userSelectOptions.find(
          (user) => user.email === selectedUserEmail,
        );
        onUserFilterChange(selectedUser?.id || "");
      }
    },
    [onUserFilterChange, userSelectOptions],
  );

  const handleResetAllFilters = useCallback(() => {
    setDateRange({
      from: defaultFromDate,
      to: defaultToDate,
    });
    onResetAllFilters?.();
  }, [onResetAllFilters]);

  const hasFiltersApplied = useMemo(() => {
    return !!(
      (globalFilter && globalFilter.trim() !== "") ||
      (filters?.type && filters.type.length > 0) ||
      (filters?.connection_type && filters.connection_type.length > 0) ||
      (filters?.direction && filters.direction.length > 0) ||
      (filters?.protocol && filters.protocol.length > 0) ||
      userId ||
      (dateFrom && dateFrom !== dayjs(defaultFromDate).format("YYYY-MM-DD")) ||
      (dateTo && dateTo !== dayjs(defaultToDate).format("YYYY-MM-DD")) ||
      connectionTypeFilter !== ""
    );
  }, [globalFilter, filters, userId, dateFrom, dateTo, connectionTypeFilter]);

  const renderNoResults = () => {
    if (!isSettingEnabled) {
      return (
        <GetStartedTest
          icon={
            <SquareIcon
              icon={
                <ArrowLeftRightIcon className={"text-nb-gray-200"} size={20} />
              }
              color={"gray"}
              size={"large"}
            />
          }
          title={"Traffic Events"}
          description={
            "Traffic Events help you understand the network activity in your organization. " +
            "You can see which machines are connecting to each other, and what kind of traffic is flowing between them."
          }
          button={
            <Button
              variant={"primary"}
              onClick={() => router.push("/settings?tab=networks")}
            >
              Enable Traffic Events
            </Button>
          }
          learnMore={
            <>
              Learn more about
              <InlineLink href={TRAFFIC_EVENTS_DOC_LINK} target={"_blank"}>
                Traffic Events
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      );
    }

    return (
      <NoResults
        hasFiltersApplied={hasFiltersApplied}
        onResetFilters={hasFiltersApplied ? handleResetAllFilters : undefined}
        title={
          hasFiltersApplied
            ? "Could not find any results"
            : "No traffic events yet"
        }
        description={
          hasFiltersApplied
            ? "We couldn't find any results. Please try a different search term or change your filters."
            : "We haven't detected any traffic events yet. This could be because you just enabled the feature, or because there hasn't been any network activity."
        }
        className={"py-10"}
      />
    );
  };

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      tableCellClassName={"py-2"}
      text={"Traffic Events"}
      sorting={sorting}
      setSorting={setSorting}
      rowClassName={"data-[accordion=opened]:!border-b-transparent"}
      renderExpandedRow={(e) => {
        // Aggregated rows are a single summary line with nothing more to show,
        // so they don't expand. Only genuine multi-sub-event rows do.
        const { isAggregated } = getTrafficEventCounts(e);
        if (isAggregated || e.events.length < 2) return undefined;
        return <TrafficEventsDetailRow event={e} />;
      }}
      columns={TrafficEventsTableColumns}
      columnVisibility={{
        user: false,
        search: false,
        source_port: false,
        destination_port: false,
        bytes_inbound: false,
        bytes_outbound: false,
        type: false,
        timestamp: false,
        policy: false,
      }}
      data={events}
      searchPlaceholder={"Search by ip, port, peer or resource..."}
      onFilterReset={handleResetAllFilters}
      showResetFilterButton={false}
      manualPagination={true}
      manualFiltering={true}
      keepStateInLocalStorage={false}
      pageCount={totalPages}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      totalRecords={totalRecords}
      globalFilter={globalFilter}
      onGlobalFilterChange={handleSearchChange}
      getStartedCard={renderNoResults()}
    >
      {(table) => {
        return (
          <>
            <TrafficEventsConnectionTypeFilter
              value={connectionTypeFilter}
              onChange={onConnectionTypeFilterChange}
            />

            <DatePickerWithRange
              value={dateRange}
              onChange={(range) => {
                handleDateFilterChange(range);
              }}
            />

            <UsersDropdownSelector
              options={userSelectOptions}
              value={
                userSelectOptions.find((user) => user.id === userId)?.email ||
                ""
              }
              onChange={handleUserFilterChange}
            />

            <TrafficEventsFilter
              table={table}
              disabled={
                !isSettingEnabled && !hasFiltersApplied && !events?.length
              }
              filters={filters}
              onFilterChange={handleFilterChange}
              closeOnSelect={true}
            />

            <DataTableRowsPerPage table={table} disabled={!events?.length} />

            <DataTableRefreshButton
              isDisabled={false}
              onClick={() => {
                mutate(apiUrl ?? "/events/network-traffic").then();
              }}
            />

            <DataTableResetFilterButton
              table={table}
              hasServerSideFilters={hasFiltersApplied}
              onClick={handleResetAllFilters}
            />
          </>
        );
      }}
    </DataTable>
  );
}
