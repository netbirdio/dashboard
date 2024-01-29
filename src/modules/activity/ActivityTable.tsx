import { DatePickerWithRange } from "@components/DatePickerWithRange";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import AddPeerButton from "@components/ui/AddPeerButton";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { ExternalLinkIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { DateRange } from "react-day-picker";
import { useSWRConfig } from "swr";
import PeerIcon from "@/assets/icons/PeerIcon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import { ActivityEntryRow } from "@/modules/activity/ActivityEntryRow";
import { ActivityEventCodeSelector } from "@/modules/activity/ActivityEventCodeSelector";
import { ActivityUserSelector } from "@/modules/activity/ActivityUserSelector";

type Props = {
  events?: ActivityEvent[];
  isLoading: boolean;
};

const ActivityFeedColumnsTable: ColumnDef<ActivityEvent>[] = [
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

export default function ActivityTable({ events, isLoading }: Props) {
  const { mutate } = useSWRConfig();
  const path = usePathname();

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
    from: dayjs().subtract(14, "day").toDate(),
    to: dayjs().toDate(),
  });

  // Range for DatePicker
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: dayjs(initialDateRange?.from).toDate(),
    to: dayjs(initialDateRange?.to).toDate(),
  });

  return (
    <DataTable
      wrapperClassName={"gap-0 flex flex-col"}
      tableClassName={"px-8 mt-10"}
      paginationClassName={"max-w-[800px]"}
      as={"div"}
      text={"Activity Events"}
      sorting={sorting}
      setSorting={setSorting}
      columns={ActivityFeedColumnsTable}
      data={events}
      searchPlaceholder={"Search by activity name..."}
      isLoading={isLoading}
      columnVisibility={{
        timestamp: false,
        name: false,
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
            {events && (
              <ActivityEventCodeSelector
                events={events}
                values={
                  (table
                    .getColumn("activity_code")
                    ?.getFilterValue() as string[]) || []
                }
                onChange={(items) => {
                  table.setPageIndex(0);
                  if (items.length == 0) {
                    table.getColumn("activity_code")?.setFilterValue(undefined);
                    return;
                  } else {
                    table.getColumn("activity_code")?.setFilterValue(items);
                  }
                }}
              />
            )}
            {events && (
              <ActivityUserSelector
                events={events}
                value={
                  (table
                    .getColumn("initiator_email")
                    ?.getFilterValue() as string) || ""
                }
                onChange={(item) => {
                  table.setPageIndex(0);
                  table.getColumn("initiator_email")?.setFilterValue(item);
                }}
              />
            )}
            <DataTableRowsPerPage
              table={table}
              disabled={events?.length == 0}
            />
            <DataTableRefreshButton
              isDisabled={events?.length == 0}
              onClick={() => {
                mutate("/events").then();
              }}
            />
          </>
        );
      }}
    </DataTable>
  );
}
