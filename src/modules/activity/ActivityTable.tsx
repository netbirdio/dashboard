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
import { uniqBy } from "lodash";
import { ExternalLinkIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { useSWRConfig } from "swr";
import PeerIcon from "@/assets/icons/PeerIcon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/i18n/I18nProvider";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import { ActivityEntryRow } from "@/modules/activity/ActivityEntryRow";
import { ActivityEventCodeSelector } from "@/modules/activity/ActivityEventCodeSelector";
import {
  UsersDropdownSelector,
  UserSelectOption,
} from "@/modules/activity/UsersDropdownSelector";

type Props = {
  events?: ActivityEvent[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

function useActivityFeedColumnsTable(): ColumnDef<ActivityEvent>[] {
  const { t } = useI18n();

  return [
    {
      accessorKey: "activity_code",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("activity.code")}</DataTableHeader>;
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
      accessorFn: (row) => row.initiator_email || t("activity.netbirdUser"),
      filterFn: "exactMatch",
    },
  ];
}

const defaultFromDate = dayjs().subtract(14, "day").toDate();
const defaultToDate = dayjs().toDate();

export default function ActivityTable({
  events,
  isLoading,
  headingTarget,
}: Props) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { t } = useI18n();
  const columns = useActivityFeedColumnsTable();

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

  const userSelectOptions = useMemo(() => {
    const uniqueUsers = uniqBy(events, (event) => event.initiator_email);
    return uniqueUsers.map((event) => {
      return {
        name: event.initiator_name,
        id: event.initiator_id,
        email: event.initiator_email || "NetBird",
        external: !!event?.meta?.external,
      } as UserSelectOption;
    });
  }, [events]);

  return (
    <DataTable
      headingTarget={headingTarget}
      paginationClassName={"max-w-[800px]"}
      as={"div"}
      text={t("activity.auditEventsTitle")}
      sorting={sorting}
      setSorting={setSorting}
      wrapperClassName={"gap-0 flex flex-col"}
      tableClassName={"px-8 pt-4"}
      columns={columns}
      data={events}
      searchPlaceholder={t("activity.searchPlaceholder")}
      isLoading={isLoading}
      columnVisibility={{
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
          title={t("activity.getStartedTitle")}
          description={t("activity.getStartedDescription")}
          button={<AddPeerButton />}
          learnMore={
            <>
              {t("activity.learnMorePrefix")}{" "}
              <InlineLink
                href={"https://docs.netbird.io/how-to/getting-started"}
                target={"_blank"}
              >
                {t("activity.learnMoreLink")}
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      onFilterReset={() => {
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
              <UsersDropdownSelector
                options={userSelectOptions}
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
                mutate("/events/audit").then();
              }}
            />
          </>
        );
      }}
    </DataTable>
  );
}
