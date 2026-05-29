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
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import DNSIcon from "@/assets/icons/DNSIcon";
import NoResults from "@/components/ui/NoResults";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Group } from "@/interfaces/Group";
import { NameserverGroup } from "@/interfaces/Nameserver";
import NameserverModal from "@/modules/dns/nameservers/NameserverModal";
import NameserverTemplateModal from "@/modules/dns/nameservers/NameserverTemplateModal";
import NameserverActionCell from "@/modules/dns/nameservers/table/NameserverActionCell";
import NameserverActiveCell from "@/modules/dns/nameservers/table/NameserverActiveCell";
import NameserverDistributionGroupsCell from "@/modules/dns/nameservers/table/NameserverDistributionGroupsCell";
import NameserverMatchDomainsCell from "@/modules/dns/nameservers/table/NameserverMatchDomainsCell";
import NameserverNameCell from "@/modules/dns/nameservers/table/NameserverNameCell";
import NameserverNameserversCell from "@/modules/dns/nameservers/table/NameserverNameserversCell";

export const NameserverGroupTableColumns: ColumnDef<NameserverGroup>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <NameserverNameCell ns={row.original} />,
  },
  {
    accessorKey: "description",
    sortingFn: "text",
  },
  {
    id: "domain_list",
    accessorFn: (row) => row.domains?.map((d) => d).join(", "),
  },
  {
    id: "ns_list",
    accessorFn: (row) => row.nameservers?.map((n) => n.ip).join(", "),
  },
  {
    accessorKey: "enabled",
    sortingFn: "basic",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Active</DataTableHeader>;
    },
    cell: ({ row }) => <NameserverActiveCell ns={row.original} />,
  },
  {
    accessorFn: (row) => row.domains?.length || 0,
    id: "domains",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Match Domains</DataTableHeader>;
    },
    cell: ({ row }) => <NameserverMatchDomainsCell ns={row.original} />,
  },
  {
    accessorFn: (row) => row.nameservers?.length || 0,
    id: "nameservers",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Nameservers</DataTableHeader>;
    },
    cell: ({ row }) => <NameserverNameserversCell ns={row.original} />,
  },
  {
    accessorFn: (row) => row.groups?.length || 0,
    id: "groups",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Groups</DataTableHeader>;
    },
    cell: ({ row }) => <NameserverDistributionGroupsCell ns={row.original} />,
  },
  {
    id: "group_names_filter",
    accessorFn: (row) =>
      ((row as NameserverGroup & { _group_names?: string[] })._group_names) ??
      [],
    filterFn: "arrIncludesSome",
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ cell }) => <NameserverActionCell ns={cell.row.original} />,
  },
];

type Props = {
  nameserverGroups?: NameserverGroup[];
  isLoading?: boolean;
  headingTarget?: HTMLHeadingElement | null;
  isGroupPage?: boolean;
  distributionGroups?: Group[];
};

export default function NameserverGroupTable({
  nameserverGroups,
  isLoading,
  headingTarget,
  isGroupPage,
  distributionGroups,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { groups } = useGroups();

  const nameserverGroupsWithNames = useMemo(() => {
    if (!nameserverGroups) return [];
    return nameserverGroups.map((ns) => ({
      ...ns,
      _group_names: (ns.groups ?? [])
        .map((id) => groups?.find((g) => g.id === id)?.name)
        .filter((n): n is string => !!n),
    }));
  }, [nameserverGroups, groups]);

  const tableGroups = useMemo(() => {
    const map = new Map<string, { id?: string; name: string }>();
    for (const ns of nameserverGroupsWithNames) {
      for (const name of ns._group_names) {
        if (name && !map.has(name)) map.set(name, { name });
      }
    }
    return Array.from(map.values());
  }, [nameserverGroupsWithNames]);

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "name",
        desc: true,
      },
    ],
    !isGroupPage,
  );

  const [editModal, setEditModal] = useState(false);
  const [currentRow, setCurrentRow] = useState<NameserverGroup>();
  const [currentCellClicked, setCurrentCellClicked] = useState("");

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
    <>
      {editModal && currentRow && (
        <NameserverModal
          preset={currentRow}
          open={editModal}
          onOpenChange={setEditModal}
          cell={currentCellClicked}
        />
      )}
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Network Routes"}
        sorting={sorting}
        setSorting={setSorting}
        wrapperComponent={isGroupPage ? Card : undefined}
        wrapperProps={isGroupPage ? { className: "mt-6 w-full" } : undefined}
        paginationPaddingClassName={isGroupPage ? "px-0 pt-8" : undefined}
        tableClassName={isGroupPage ? "mt-0" : undefined}
        inset={false}
        minimal={isGroupPage}
        showSearchAndFilters={isGroupPage}
        keepStateInLocalStorage={!isGroupPage}
        initialPageSize={25}
        showResetFilterButton={false}
        aboveTable={(table) => (
          <TableFilterChips table={table} filters={filterDefs} />
        )}
        columnVisibility={{
          description: false,
          domain_list: false,
          ns_list: false,
          group_names_filter: false,
        }}
        onRowClick={(row, cell) => {
          setCurrentRow(row.original);
          setEditModal(true);
          setCurrentCellClicked(cell);
        }}
        columns={NameserverGroupTableColumns}
        data={nameserverGroupsWithNames}
        searchPlaceholder={"Search by name, domains or nameservers..."}
        getStartedCard={
          isGroupPage ? (
            <NoResults
              icon={<DNSIcon className={"fill-nb-gray-200"} size={20} />}
              className={"py-4"}
              title={"This group is not used within any nameservers yet"}
              description={
                "Assign this group as a distribution group in your nameservers to see them listed here."
              }
            >
              <NameserverTemplateModal distributionGroups={distributionGroups}>
                <Button
                  variant={"primary"}
                  className={"mt-4"}
                  disabled={!permission.nameservers.create}
                >
                  <PlusCircle size={16} />
                  Add Nameserver
                </Button>
              </NameserverTemplateModal>
            </NoResults>
          ) : (
            <GetStartedTest
              icon={
                <SquareIcon
                  icon={<DNSIcon className={"fill-nb-gray-200"} size={20} />}
                  color={"gray"}
                  size={"large"}
                />
              }
              title={"Create Nameserver"}
              description={
                "It looks like you don't have any nameservers. Get started by adding one to your network. Select a predefined or add your custom nameservers."
              }
              button={
                <div className={"flex flex-col"}>
                  <div>
                    <NameserverTemplateModal
                      distributionGroups={distributionGroups}
                    >
                      <Button
                        variant={"primary"}
                        className={""}
                        disabled={!permission.nameservers.create}
                      >
                        <PlusCircle size={16} />
                        Add Nameserver
                      </Button>
                    </NameserverTemplateModal>
                  </div>
                </div>
              }
              learnMore={
                <>
                  Learn more about
                  <InlineLink
                    href={
                      "https://docs.netbird.io/how-to/manage-dns-in-your-network"
                    }
                    target={"_blank"}
                  >
                    DNS
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                </>
              }
            />
          )
        }
        rightSide={() => (
          <>
            {nameserverGroups && nameserverGroups?.length > 0 && (
              <NameserverTemplateModal distributionGroups={distributionGroups}>
                <Button
                  variant={"primary"}
                  className={"ml-auto"}
                  disabled={!permission.nameservers.create}
                >
                  <PlusCircle size={16} />
                  Add Nameserver
                </Button>
              </NameserverTemplateModal>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <TableFiltersButton
              table={table}
              filters={filterDefs}
              disabled={nameserverGroups?.length == 0}
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
              isDisabled={nameserverGroups?.length == 0}
              onClick={() => {
                mutate("/dns/nameservers").then();
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
