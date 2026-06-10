import Button from "@components/Button";
import Card from "@components/Card";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  formatGroupsChip,
  GroupsPicker,
} from "@components/table/filters/GroupsPicker";
import {
  formatRadioChip,
  RadioOption,
  RadioPicker,
} from "@components/table/filters/RadioPicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import GetStartedTest from "@components/ui/GetStartedTest";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DNS_ZONE_DOCS_LINK, DNSZone } from "@/interfaces/DNS";
import { useDNSZones } from "@/modules/dns/zones/DNSZonesProvider";
import DNSRecordsTable from "@/modules/dns/zones/records/DNSRecordsTable";
import { DNSZonesActionCell } from "@/modules/dns/zones/table/DNSZonesActionCell";
import { DNSZonesActiveCell } from "@/modules/dns/zones/table/DNSZonesActiveCell";
import { DNSZonesGroupCell } from "@/modules/dns/zones/table/DNSZonesGroupCell";
import { DNSZonesNameCell } from "@/modules/dns/zones/table/DNSZonesNameCell";
import { DNSZonesRecordsCell } from "@/modules/dns/zones/table/DNSZonesRecordsCell";
import { DNSZonesSearchDomainCell } from "@/modules/dns/zones/table/DNSZonesSearchDomainCell";
import { Group } from "@/interfaces/Group";
import DNSZoneIcon from "@/assets/icons/DNSZoneIcon";
import { useGroups } from "@/contexts/GroupsProvider";

export const DNSZonesColumns: ColumnDef<DNSZone>[] = [
  {
    accessorKey: "domain",
    header: ({ column }) => (
      <DataTableHeader column={column}>Zone</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => <DNSZonesNameCell zone={row.original} />,
  },
  {
    accessorKey: "enabled",
    header: ({ column }) => (
      <DataTableHeader column={column}>Active</DataTableHeader>
    ),
    cell: ({ row }) => <DNSZonesActiveCell zone={row.original} />,
  },
  {
    accessorKey: "records",
    header: ({ column }) => (
      <DataTableHeader column={column}>Records</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => <DNSZonesRecordsCell zone={row.original} />,
  },
  {
    accessorKey: "distribution_groups",
    header: ({ column }) => (
      <DataTableHeader column={column}>Groups</DataTableHeader>
    ),
    cell: ({ row }) => <DNSZonesGroupCell zone={row.original} />,
  },
  {
    id: "group_names_filter",
    accessorFn: (row) =>
      ((row as DNSZone & { _group_names?: string[] })._group_names) ?? [],
    filterFn: "arrIncludesSome",
  },
  {
    accessorKey: "enable_search_domain",
    header: ({ column }) => (
      <DataTableHeader column={column}>Search Domain</DataTableHeader>
    ),
    cell: ({ row }) => <DNSZonesSearchDomainCell zone={row.original} />,
  },
  {
    accessorKey: "id",
    header: () => "",
    cell: ({ row }) => <DNSZonesActionCell zone={row.original} />,
  },
  {
    id: "searchString",
    accessorFn: (row) => {
      return [
        row?.groups_search,
        row?.name,
        row?.domain,
        row?.records?.map((r) => r.name).join(""),
        row?.records?.map((r) => r.content).join(""),
        row?.records?.map((r) => r.type).join(""),
      ]?.join("");
    },
  },
];

type Props = {
  isLoading: boolean;
  data?: DNSZone[];
  headingTarget?: HTMLHeadingElement | null;
  isGroupPage?: boolean;
  distributionGroups?: Group[];
};

export default function DNSZonesTable({
  data,
  isLoading,
  headingTarget,
  isGroupPage = false,
  distributionGroups,
}: Props) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { groups } = useGroups();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "domain",
        desc: true,
      },
      {
        id: "id",
        desc: true,
      },
    ],
    !isGroupPage,
  );

  const zonesWithGroups = useMemo(() => {
    return (
      data?.map((zone) => {
        const groupNames = (zone?.distribution_groups ?? [])
          .map((id) => groups?.find((g) => g.id === id)?.name)
          .filter((n): n is string => !!n);
        return {
          ...zone,
          _group_names: groupNames,
          groups_search: groupNames.join(""),
        } as DNSZone & { _group_names: string[] };
      }) ?? []
    );
  }, [data, groups]);

  const tableGroups = useMemo(() => {
    const map = new Map<string, { id?: string; name: string }>();
    for (const zone of zonesWithGroups) {
      for (const name of zone._group_names ?? []) {
        if (name && !map.has(name)) map.set(name, { name });
      }
    }
    return Array.from(map.values());
  }, [zonesWithGroups]);

  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All", dotClass: "bg-nb-gray-500" },
      { value: true, label: "Active", dotClass: "bg-green-500" },
      { value: false, label: "Inactive", dotClass: "bg-nb-gray-700" },
    ],
    [],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "enabled",
        label: "Status",
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as boolean | undefined}
            onChange={p.onChange}
            close={p.close}
            options={statusOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as boolean | undefined, statusOptions),
      },
      {
        id: "group_names_filter",
        label: "Groups",
        renderPicker: (p) => (
          <GroupsPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            groups={tableGroups}
          />
        ),
        formatChip: (v) => formatGroupsChip(v as string[] | undefined),
      },
    ],
    [statusOptions, tableGroups],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={"DNS Zones"}
      sorting={sorting}
      setSorting={setSorting}
      columns={DNSZonesColumns}
      data={zonesWithGroups}
      useRowId={true}
      wrapperComponent={isGroupPage ? Card : undefined}
      wrapperProps={isGroupPage ? { className: "mt-6 w-full" } : undefined}
      paginationPaddingClassName={isGroupPage ? "px-0 pt-8" : undefined}
      tableClassName={isGroupPage ? "mt-0 mb-2" : undefined}
      inset={false}
      minimal={isGroupPage}
      keepStateInLocalStorage={!isGroupPage}
      initialPageSize={25}
      showResetFilterButton={false}
      searchPlaceholder={"Search by domain, ip, content or group..."}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      columnVisibility={{ searchString: false, group_names_filter: false }}
      renderExpandedRow={(zone) => {
        const hasRecords = (zone?.records?.length ?? 0) > 0;
        if (!hasRecords) return;
        return (
          <>
            <DNSRecordsTable zone={zone} />
            <div className={"h-2 w-full bg-nb-gray-960"}></div>
          </>
        );
      }}
      getStartedCard={
        isGroupPage ? (
          <NoResults
            icon={<DNSZoneIcon className={"fill-nb-gray-200"} size={24} />}
            className={"py-4"}
            contentClassName={"max-w-lg"}
            title={"This group is not used within any zones yet"}
            description={
              "Assign this group as a distribution group in your zones to see them listed here."
            }
          >
            <div className={"gap-x-4 flex items-center justify-center mt-4"}>
              <AddZoneButton distributionGroups={distributionGroups} />
            </div>
          </NoResults>
        ) : (
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<DNSZoneIcon className={"fill-nb-gray-200"} size={24} />}
                color={"gray"}
                size={"large"}
              />
            }
            title={"Create New Zone"}
            description={
              "It looks like you don't have any zones. Control domain name resolution for your network by adding a zone."
            }
            button={
              <div className={"gap-x-4 flex items-center justify-center"}>
                <AddZoneButton distributionGroups={distributionGroups} />
              </div>
            }
            learnMore={
              <>
                Learn more about
                <InlineLink href={DNS_ZONE_DOCS_LINK} target={"_blank"}>
                  DNS Zones
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
          />
        )
      }
      rightSide={() => (
        <>
          {data && data?.length > 0 && (
            <div className={"gap-x-4 ml-auto flex"}>
              <AddZoneButton distributionGroups={distributionGroups} />
            </div>
          )}
        </>
      )}
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={data?.length == 0}
          />
          <DataTableResetFilterButton
            table={table}
            onClick={() => {
              table.setPageIndex(0);
              table.resetColumnFilters();
              table.resetGlobalFilter();
            }}
          />
          <DataTableRefreshButton
            isDisabled={data?.length == 0}
            onClick={() => {
              mutate("/dns/zones").then();
              mutate("/groups").then();
            }}
          />
        </>
      )}
    </DataTable>
  );
}

type AddZoneButtonProps = {
  distributionGroups?: Group[];
};

const AddZoneButton = ({ distributionGroups }: AddZoneButtonProps) => {
  const { permission } = usePermissions();
  const { openZoneModal } = useDNSZones();

  return (
    <Button
      variant={"primary"}
      className={""}
      disabled={!permission?.dns?.create}
      onClick={() => openZoneModal(undefined, distributionGroups)}
    >
      <PlusCircle size={16} />
      Add Zone
    </Button>
  );
};
