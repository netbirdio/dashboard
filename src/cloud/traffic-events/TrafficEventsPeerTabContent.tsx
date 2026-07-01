import Button from "@components/Button";
import Card from "@components/Card";
import { DatePickerWithRange } from "@components/DatePickerWithRange";
import Paragraph from "@components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import { DataTable } from "@components/table/DataTable";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { TabsTrigger } from "@components/Tabs";
import NoResults from "@components/ui/NoResults";
import type { SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import dayjs from "dayjs";
import { isEqual } from "lodash";
import {
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Suspense, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { useSWRConfig } from "swr";
import {
  TrafficEvent,
  TrafficEventDirection,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { TrafficEventsDetailRow } from "@/cloud/traffic-events/table/TrafficEventsDetailRow";
import { TrafficEventsInboundOutboundFilter } from "@/cloud/traffic-events/TrafficEventsInboundOutboundFilter";
import {
  TrafficEventsTableColumns,
  TrafficEventsTableProps,
} from "@/cloud/traffic-events/TrafficEventsTable";
import { usePeer } from "@/contexts/PeerProvider";
import { Pagination } from "@/interfaces/Pagination";
import { useAccount } from "@/modules/account/useAccount";
import InlineLink from "@components/InlineLink";
import { TRAFFIC_EVENTS_DOC_LINK } from "@/cloud/traffic-events/TrafficEventSetting";

export const TrafficEventsPeerTabContent = () => {
  const account = useAccount();
  const { peer } = usePeer();
  const { mutate } = useSWRConfig();
  const isEnabled = !!account?.settings?.extra?.network_traffic_logs_enabled;

  const peerId = peer?.id || "";

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const defaultDirection = peer?.user_id
    ? TrafficEventDirection.EGRESS
    : TrafficEventDirection.INGRESS;

  const [trafficType, setTrafficType] =
    useState<TrafficEventDirection>(defaultDirection);

  const defaultDateRange = {
    from: dayjs().subtract(7, "day").startOf("day").toDate(),
    to: dayjs().endOf("day").toDate(),
  };

  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    defaultDateRange,
  );

  const buildApiUrl = (
    p: number,
    ps: number,
    sq: string,
    dir: TrafficEventDirection,
    dateFrom?: Date,
    dateTo?: Date,
  ) => {
    let url = `/events/network-traffic?page=${p}&page_size=${ps}&reporter_id=${peerId}${
      sq ? `&search=${encodeURIComponent(sq)}` : ""
    }&direction=${dir}`;

    if (dateFrom && dateTo) {
      url += `&start_date=${dayjs(dateFrom).format("YYYY-MM-DDTHH:mm:ss[Z]")}`;
      url += `&end_date=${dayjs(dateTo).format("YYYY-MM-DDTHH:mm:ss[Z]")}`;
    }

    return url;
  };

  const { data: events, isLoading } = useFetchApi<Pagination<TrafficEvent[]>>(
    buildApiUrl(
      page,
      pageSize,
      searchQuery,
      trafficType,
      dateRange?.from,
      dateRange?.to,
    ),
  );

  const isInbound = trafficType === TrafficEventDirection.INGRESS;

  const handlePaginationChange = (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => {
    if (pagination.pageSize !== pageSize) {
      setPage(1);
      setPageSize(pagination.pageSize);
      mutate(
        buildApiUrl(
          1,
          pagination.pageSize,
          searchQuery,
          trafficType,
          dateRange?.from,
          dateRange?.to,
        ),
      );
    } else {
      setPage(pagination.pageIndex + 1);
      setPageSize(pagination.pageSize);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    mutate(
      buildApiUrl(
        1,
        pageSize,
        value,
        trafficType,
        dateRange?.from,
        dateRange?.to,
      ),
    );
  };

  const handleTrafficTypeChange = (type: TrafficEventDirection) => {
    setTrafficType(type);
    setPage(1);
    mutate(
      buildApiUrl(
        1,
        pageSize,
        searchQuery,
        type,
        dateRange?.from,
        dateRange?.to,
      ),
    );
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(1);
    mutate(
      buildApiUrl(
        1,
        pageSize,
        searchQuery,
        trafficType,
        range?.from,
        range?.to,
      ),
    );
  };

  const hasActiveFilters = (): boolean => {
    return searchQuery !== "" || !isEqual(dateRange, defaultDateRange);
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setDateRange(defaultDateRange);
    setPage(1);

    mutate(
      buildApiUrl(
        1,
        pageSize,
        "",
        defaultDirection,
        defaultDateRange.from,
        defaultDateRange.to,
      ),
    );
  };

  const trafficEvents = useMemo(() => {
    return events?.data?.map((event) => ({
      ...event,
      id: event.flow_id,
    }));
  }, [events]);

  return (
    <div className={"pb-10 px-8"}>
      <div className={""}>
        <div className={"flex justify-between items-center mb-5"}>
          <div>
            <Paragraph>
              Here you can see all the {isInbound ? "inbound" : "outbound"}{" "}
              traffic events for this peer.
            </Paragraph>
            <Paragraph>
              Learn more about{" "}
              <InlineLink href={TRAFFIC_EVENTS_DOC_LINK} target="_blank">
                Traffic Events <ExternalLinkIcon size={12} />
              </InlineLink>{" "}
              in our documentation.
            </Paragraph>
          </div>
        </div>

        <Suspense
          fallback={
            <div>
              <SkeletonTableHeader className={"!p-0"} />
              <div className={"mt-8 w-full"}>
                <SkeletonTable withHeader={false} />
              </div>
            </div>
          }
        >
          <TrafficEventsPeerDetailTable
            events={trafficEvents}
            isSettingEnabled={isEnabled}
            isLoading={isLoading}
            trafficType={trafficType}
            setTrafficType={handleTrafficTypeChange}
            pagination={
              events
                ? {
                    pageIndex: events.page - 1,
                    pageSize: events.page_size,
                  }
                : undefined
            }
            totalRecords={events?.total_records}
            pageCount={events?.total_pages}
            onPaginationChange={handlePaginationChange}
            peerId={peerId}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            buildApiUrl={buildApiUrl}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            hasActiveFilters={hasActiveFilters()}
            onResetFilters={resetAllFilters}
            defaultDirection={defaultDirection}
            defaultDateRange={defaultDateRange}
            totalEvents={events?.total_records}
          />
        </Suspense>
      </div>
    </div>
  );
};

const TrafficEventsPeerDetailTable = ({
  events,
  isSettingEnabled,
  isLoading,
  headingTarget,
  trafficType,
  setTrafficType,
  pagination,
  totalRecords,
  pageCount,
  onPaginationChange,
  peerId,
  searchQuery,
  onSearchChange,
  buildApiUrl,
  dateRange,
  onDateRangeChange,
  hasActiveFilters,
  onResetFilters,
  defaultDirection,
  defaultDateRange,
  totalEvents,
}: TrafficEventsTableProps & {
  trafficType: TrafficEventDirection;
  setTrafficType: (value: TrafficEventDirection) => void;
  pagination?: {
    pageIndex: number;
    pageSize: number;
  };
  totalRecords?: number;
  pageCount?: number;
  onPaginationChange?: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  peerId: string;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  buildApiUrl: (
    p: number,
    ps: number,
    sq: string,
    dir: TrafficEventDirection,
    dateFrom?: Date,
    dateTo?: Date,
  ) => string;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  defaultDirection: TrafficEventDirection;
  defaultDateRange: DateRange;
  totalEvents?: number;
}) => {
  const { mutate } = useSWRConfig();
  const router = useRouter();

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "timestamp",
      desc: true,
    },
  ]);

  const isInbound = trafficType === TrafficEventDirection.INGRESS;

  const [initialDateRange, setInitialDateRange] = useState<
    DateRange | undefined
  >(dateRange);

  return (
    <DataTable
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-6 w-full" }}
      headingTarget={headingTarget}
      useRowId={true}
      sorting={sorting}
      tableCellClassName={"py-2"}
      setSorting={setSorting}
      minimal={true}
      showSearchAndFilters={true}
      inset={false}
      rowClassName={"data-[accordion=opened]:!border-b-transparent"}
      renderExpandedRow={(e) => {
        if (e.events.length < 2) return undefined;
        return <TrafficEventsDetailRow event={e} className={"ml-[11px]"} />;
      }}
      tableClassName={"mt-0"}
      columns={TrafficEventsTableColumns}
      keepStateInLocalStorage={false}
      data={events}
      globalFilter={searchQuery}
      onGlobalFilterChange={onSearchChange}
      manualFiltering={true}
      searchPlaceholder={"Search by ip, port, peer or resource..."}
      columnVisibility={{
        user: false,
        source: true,
        destination: true,
        search: false,
        source_port: false,
        destination_port: false,
        bytes_all: true,
        bytes_inbound: false,
        bytes_outbound: false,
        reporter: false,
        direction: false,
        type: false,
        timestamp: false,
        policy: false,
      }}
      isLoading={isLoading}
      onFilterReset={() => {
        onResetFilters();
        setInitialDateRange(defaultDateRange);
      }}
      showResetFilterButton={false}
      getStartedCard={
        <NoResults
          className={"py-4"}
          title={
            isSettingEnabled ? "No Traffic Events" : "Traffic Events Disabled"
          }
          description={
            isSettingEnabled
              ? "It looks like you don't have any traffic events. Traffic events will appear here once clients start connecting to your network."
              : "It looks like you don't have any traffic events. To start receiving traffic events, you need to enable it in your account settings."
          }
          icon={<ArrowLeftRightIcon size={20} className={"text-nb-gray-200"} />}
        >
          {!isSettingEnabled && (
            <div className={"flex gap-4 items-center justify-center mt-5"}>
              <Button
                variant={"primary"}
                onClick={() => router.push("/settings?tab=networks")}
              >
                Go to Settings
                <ArrowUpRightIcon size={16} />
              </Button>
            </div>
          )}
        </NoResults>
      }
      paginationPaddingClassName={"px-0 pt-8"}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      totalRecords={totalRecords}
      pageCount={pageCount}
      manualPagination={true}
    >
      {(table) => (
        <>
          <TrafficEventsInboundOutboundFilter
            value={trafficType}
            onChange={(type) => {
              table.setPageIndex(0);
              setTrafficType(type);
            }}
          />

          {events && events?.length > 0 && (
            <DatePickerWithRange
              value={dateRange}
              onChange={(range) => {
                setInitialDateRange(range);
                table.setPageIndex(0);
                onDateRangeChange?.(range);
              }}
            />
          )}

          <DataTableRowsPerPage
            table={table}
            disabled={!events || events?.length == 0}
          />

          <DataTableRefreshButton
            isDisabled={!events || events?.length == 0}
            onClick={() => {
              const currentPage =
                pagination?.pageIndex !== undefined
                  ? pagination.pageIndex + 1
                  : 1;
              const currentPageSize = pagination?.pageSize || 10;
              mutate(
                buildApiUrl(
                  currentPage,
                  currentPageSize,
                  searchQuery || "",
                  trafficType,
                  dateRange?.from,
                  dateRange?.to,
                ),
              ).then();
            }}
          />

          <DataTableResetFilterButton
            table={table}
            hasServerSideFilters={hasActiveFilters}
            onClick={onResetFilters}
          />
        </>
      )}
    </DataTable>
  );
};

export const TrafficEventsPeerTabTrigger = () => {
  return (
    <TabsTrigger value={"traffic-events"}>
      <ArrowLeftRightIcon size={16} />
      Traffic Events
    </TabsTrigger>
  );
};
