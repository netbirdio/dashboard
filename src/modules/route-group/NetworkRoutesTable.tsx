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
import { cloneDeep } from "lodash";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import GroupRouteProvider from "@/contexts/GroupRouteProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Group } from "@/interfaces/Group";
import { GroupedRoute, Route } from "@/interfaces/Route";
import { AddExitNodeButton } from "@/modules/exit-node/AddExitNodeButton";
import GroupedRouteActionCell from "@/modules/route-group/GroupedRouteActionCell";
import GroupedRouteHighAvailabilityCell from "@/modules/route-group/GroupedRouteHighAvailabilityCell";
import GroupedRouteNameCell from "@/modules/route-group/GroupedRouteNameCell";
import GroupedRouteNetworkRangeCell from "@/modules/route-group/GroupedRouteNetworkRangeCell";
import GroupedRouteTypeCell from "@/modules/route-group/GroupedRouteTypeCell";
import { RouteAddRoutingPeerProvider } from "@/modules/routes/RouteAddRoutingPeerProvider";
import RouteModal from "@/modules/routes/RouteModal";
import RouteTable from "@/modules/routes/RouteTable";

export const GroupedRouteTableColumns: ColumnDef<GroupedRoute>[] = [
  {
    accessorKey: "network_id",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <GroupedRouteNameCell groupedRoute={row.original} />,
  },
  {
    accessorKey: "description",
    sortingFn: "text",
  },
  {
    accessorKey: "description_search",
    sortingFn: "text",
  },
  {
    accessorKey: "domain_search",
    sortingFn: "text",
  },
  {
    id: "enabled",
    accessorKey: "enabled",
    sortingFn: "basic",
  },
  {
    id: "group_names",
    accessorFn: (row) => {
      return row.group_names?.map((name) => name).join(", ");
    },
  },
  {
    id: "group_names_filter",
    accessorFn: (row) => row.group_names ?? [],
    filterFn: "arrIncludesSome",
  },
  {
    accessorKey: "routes_search",
  },
  {
    id: "domains",
    accessorFn: (row) => {
      return row.domains?.map((name) => name).join(", ");
    },
  },
  {
    accessorKey: "network",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Network</DataTableHeader>;
    },
    cell: ({ row }) => (
      <GroupedRouteNetworkRangeCell
        network={row.original.network}
        domains={row.original?.domains}
      />
    ),
  },
  {
    id: "type",
    accessorFn: (row) => row.is_using_route_groups,
    header: ({ column }) => {
      return <DataTableHeader column={column}>Type</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <GroupedRouteTypeCell groupedRoute={row.original} />,
  },

  {
    accessorKey: "high_availability_count",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>High Availability</DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupedRouteHighAvailabilityCell groupedRoute={row.original} />
    ),
  },

  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <GroupedRouteActionCell groupedRoute={row.original} />,
  },
];

type Props = {
  isLoading: boolean;
  groupedRoutes?: GroupedRoute[];
  routes?: Route[];
  headingTarget?: HTMLHeadingElement | null;
  isGroupPage?: boolean;
  distributionGroups?: Group[];
};

export default function NetworkRoutesTable({
  isLoading,
  groupedRoutes,
  routes,
  headingTarget,
  isGroupPage = false,
  distributionGroups,
}: Props) {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "network_id",
        desc: true,
      },
      {
        id: "enabled",
        desc: true,
      },
      {
        id: "network",
        desc: true,
      },
    ],
    !isGroupPage,
  );

  const [routeModal, setRouteModal] = useState(false);

  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All", dotClass: "bg-nb-gray-500" },
      { value: true, label: "Enabled", dotClass: "bg-green-500" },
      { value: false, label: "Disabled", dotClass: "bg-nb-gray-700" },
    ],
    [],
  );

  const tableGroups = useMemo(() => {
    if (!groupedRoutes) return [];
    const map = new Map<string, { id?: string; name: string }>();
    for (const route of groupedRoutes) {
      for (const name of route.group_names ?? []) {
        if (name && !map.has(name)) {
          map.set(name, { name });
        }
      }
    }
    return Array.from(map.values());
  }, [groupedRoutes]);

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
    <RouteAddRoutingPeerProvider>
      <RouteModal
        open={routeModal}
        setOpen={setRouteModal}
        distributionGroups={distributionGroups}
      />
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Network Routes"}
        sorting={sorting}
        setSorting={setSorting}
        columns={GroupedRouteTableColumns}
        data={groupedRoutes}
        wrapperComponent={isGroupPage ? Card : undefined}
        wrapperProps={isGroupPage ? { className: "mt-6 w-full" } : undefined}
        paginationPaddingClassName={isGroupPage ? "px-0 pt-8" : undefined}
        tableClassName={isGroupPage ? "mt-0" : undefined}
        inset={false}
        minimal={isGroupPage}
        keepStateInLocalStorage={!isGroupPage}
        initialPageSize={25}
        showResetFilterButton={false}
        searchPlaceholder={"Search by network, range, name or groups..."}
        aboveTable={(table) => (
          <TableFilterChips table={table} filters={filterDefs} />
        )}
        columnVisibility={{
          enabled: false,
          description: false,
          description_search: false,
          group_names: false,
          group_names_filter: false,
          domains: false,
          domain_search: false,
          routes_search: false,
        }}
        renderExpandedRow={(row) => {
          const data = cloneDeep(row);
          return (
            <GroupRouteProvider groupedRoute={data}>
              <RouteTable row={data} />
            </GroupRouteProvider>
          );
        }}
        getStartedCard={
          isGroupPage ? (
            <NoResults
              icon={
                <NetworkRoutesIcon className={"fill-nb-gray-200"} size={20} />
              }
              className={"py-4"}
              title={"This group is not used within any network routes yet"}
              description={
                "Assign this group when creating a new route to see them listed here."
              }
            >
              <div className={"gap-x-4 flex items-center justify-center mt-4"}>
                <AddExitNodeButton distributionGroups={distributionGroups} />
                <Button
                  variant={"primary"}
                  className={""}
                  onClick={() => setRouteModal(true)}
                  disabled={!permission.routes.create}
                >
                  <PlusCircle size={16} />
                  Add Route
                </Button>
              </div>
            </NoResults>
          ) : (
            <GetStartedTest
              icon={
                <SquareIcon
                  icon={
                    <NetworkRoutesIcon
                      className={"fill-nb-gray-200"}
                      size={20}
                    />
                  }
                  color={"gray"}
                  size={"large"}
                />
              }
              title={"Create New Route"}
              description={
                "It looks like you don't have any routes. Access LANs and VPC by adding a network route."
              }
              button={
                <div className={"gap-x-4 flex items-center justify-center"}>
                  <AddExitNodeButton distributionGroups={distributionGroups} />
                  <Button
                    variant={"primary"}
                    className={""}
                    onClick={() => setRouteModal(true)}
                    disabled={!permission.routes.create}
                  >
                    <PlusCircle size={16} />
                    Add Route
                  </Button>
                </div>
              }
              learnMore={
                <>
                  Learn more about
                  <InlineLink
                    href={
                      "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                    }
                    target={"_blank"}
                  >
                    Network Routes
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                </>
              }
            />
          )
        }
        rightSide={() => (
          <>
            {routes && routes?.length > 0 && (
              <div className={"gap-x-4 ml-auto flex"}>
                <AddExitNodeButton distributionGroups={distributionGroups} />
                <Button
                  variant={"primary"}
                  className={""}
                  onClick={() => setRouteModal(true)}
                  disabled={!permission.routes.create}
                >
                  <PlusCircle size={16} />
                  Add Route
                </Button>
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
              disabled={routes?.length == 0}
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
              isDisabled={routes?.length == 0}
              onClick={() => {
                mutate("/setup-keys").then();
                mutate("/groups").then();
              }}
            />
          </>
        )}
      </DataTable>
    </RouteAddRoutingPeerProvider>
  );
}
