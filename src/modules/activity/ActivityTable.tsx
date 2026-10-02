import { DatePickerWithRange } from "@components/DatePickerWithRange";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
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
import AddPeerButton from "@components/ui/AddPeerButton";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { uniqBy } from "lodash";
import { ExternalLinkIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { useSWRConfig } from "swr";
import PeerIcon from "@/assets/icons/PeerIcon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import { ActivityEntryRow } from "@/modules/activity/ActivityEntryRow";
import {
  ActivityTypePicker,
  formatActivityTypeChip,
} from "@/modules/activity/ActivityTypePicker";

type Props = {
  events?: ActivityEvent[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

const ActivityFeedColumnsTable: ColumnDef<ActivityEvent>[] = [
  {
    id: "id",
    accessorKey: "id",
    filterFn: "exactMatch",
  },
  {
    accessorKey: "activity_code",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Code</DataTableHeader>;
    },
    sortingFn: "text",
    filterFn: "arrIncludesSomeExact",
    cell: ({ row }) => <ActivityEntryRow event={row.original} />,
  },
  {
    id: "activity_text",
    accessorFn: (event) => {
      try {
        if (event.meta) {
          return Object.keys(event.meta)
            .map((key) => {
              return `${event?.meta[key]}`;
            })
            .join(" ");
        }
      } catch (error) {
        return "";
      }
    },
  },
  {
    accessorKey: "timestamp",
    id: "timestamp",
    filterFn: "dateRange",
  },
  {
    accessorKey: "activity",
    id: "name",
  },
  {
    id: "initiator_email",
    accessorFn: (row) => row.initiator_email || "NetBird",
    filterFn: "exactMatch",
  },
];

const defaultFromDate = dayjs().subtract(14, "day").toDate();
const defaultToDate = dayjs().toDate();

export default function ActivityTable({
  events,
  isLoading,
  headingTarget,
}: Props) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  // `?id=` opens the log on one event (the assistant links here), the way the
  // network resources table takes `?resource=`.
  const eventId = params.get("id") ?? undefined;
  const removeEventParam = React.useCallback(() => {
    if (!eventId) return;
    const newParams = new URLSearchParams(params.toString());
    newParams.delete("id");
    router.replace(`?${newParams.toString()}`, { scroll: false });
  }, [eventId, params, router]);

  // Default sorting state of the table
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "timestamp",
      desc: true,
    },
  ]);

  // Initial Date Range
  const [initialDateRange, setInitialDateRange] = useLocalStorage<
    DateRange | undefined
  >("netbird-table-range" + path, {
    from: defaultFromDate,
    to: defaultToDate,
  });

  // Range for DatePicker
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: dayjs(initialDateRange?.from).toDate(),
    to: dayjs(initialDateRange?.to).toDate(),
  });

  const userOptions = useMemo<UserOption[]>(() => {
    const uniqueUsers = uniqBy(events, (event) => event.initiator_email);
    return uniqueUsers.map((event) => ({
      name: event.initiator_name,
      id: event.initiator_id,
      email: event.initiator_email || "NetBird",
      external: !!event?.meta?.external,
    }));
  }, [events]);

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "activity_code",
        label: "Type",
        renderPicker: (p) => (
          <ActivityTypePicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            events={events ?? []}
          />
        ),
        formatChip: (v) => formatActivityTypeChip(v as string[] | undefined),
      },
      {
        id: "initiator_email",
        label: "Initiator",
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
    ],
    [events, userOptions],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      paginationClassName={"max-w-[800px]"}
      as={"div"}
      text={"Audit Events"}
      sorting={sorting}
      setSorting={setSorting}
      initialPageSize={25}
      keepStateInLocalStorage={!eventId}
      initialFilters={eventId ? [{ id: "id", value: eventId }] : undefined}
      initialSearch={eventId}
      showResetFilterButton={false}
      wrapperClassName={"gap-0 flex flex-col"}
      tableClassName={"px-8 pt-4"}
      columns={ActivityFeedColumnsTable}
      data={events}
      searchPlaceholder={"Search by audit name, user, peer, meta..."}
      isLoading={isLoading}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      columnVisibility={{
        id: false,
        timestamp: false,
        name: false,
        activity_text: false,
        initiator_email: false,
      }}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<PeerIcon className={"fill-nb-gray-200"} size={20} />}
              color={"gray"}
              size={"large"}
            />
          }
          title={"Get Started with NetBird"}
          description={
            "It looks like you don't have any connected machines.\n" +
            "Get started by adding one to your network."
          }
          button={<AddPeerButton />}
          learnMore={
            <>
              Learn more in our{" "}
              <InlineLink
                href={"https://docs.netbird.io/how-to/getting-started"}
                target={"_blank"}
              >
                Getting Started Guide
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      onFilterReset={() => {
        removeEventParam();
        const date = { from: defaultFromDate, to: defaultToDate };
        setInitialDateRange(date);
        setDateRange(date);
      }}
    >
      {(table) => {
        return (
          <>
            <DatePickerWithRange
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                setInitialDateRange(range);
                table.setPageIndex(0);
                table
                  .getColumn("timestamp")
                  ?.setFilterValue([range?.from, range?.to]);
              }}
            />
            <TableFiltersButton
              table={table}
              filters={filterDefs}
              disabled={events?.length == 0}
            />
            <DataTableResetFilterButton
              table={table}
              onClick={() => {
                removeEventParam();
                table.setPageIndex(0);
                table.resetColumnFilters();
                table.resetGlobalFilter();
                const date = { from: defaultFromDate, to: defaultToDate };
                setInitialDateRange(date);
                setDateRange(date);
                table
                  .getColumn("timestamp")
                  ?.setFilterValue([date.from, date.to]);
              }}
            />
            <DataTableRefreshButton
              isDisabled={events?.length == 0}
              onClick={() => {
                mutate("/events/audit").then();
              }}
            />
          </>
        );
      }}
    </DataTable>
  );
}
