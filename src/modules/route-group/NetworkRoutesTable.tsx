import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cloneDeep } from "lodash";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import GroupRouteProvider from "@/contexts/GroupRouteProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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
};

export default function NetworkRoutesTable({
  isLoading,
  groupedRoutes,
  routes,
  headingTarget,
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
  );

  const [routeModal, setRouteModal] = useState(false);

  return (
    <RouteAddRoutingPeerProvider>
      <RouteModal open={routeModal} setOpen={setRouteModal} />
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Network Routes"}
        sorting={sorting}
        setSorting={setSorting}
        columns={GroupedRouteTableColumns}
        data={groupedRoutes}
        searchPlaceholder={"Search by network, range, name or groups..."}
        columnVisibility={{
          enabled: false,
          description: false,
          description_search: false,
          group_names: false,
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
          <GetStartedTest
            icon={
              <SquareIcon
                icon={
                  <NetworkRoutesIcon className={"fill-nb-gray-200"} size={20} />
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
                <AddExitNodeButton />
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
        }
        rightSide={() => (
          <>
            {routes && routes?.length > 0 && (
              <div className={"gap-x-4 ml-auto flex"}>
                <AddExitNodeButton />
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
            <ButtonGroup disabled={routes?.length == 0}>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("enabled")?.setFilterValue(true);
                }}
                disabled={routes?.length == 0}
                variant={
                  table.getColumn("enabled")?.getFilterValue() == true
                    ? "tertiary"
                    : "secondary"
                }
              >
                Enabled
              </ButtonGroup.Button>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("enabled")?.setFilterValue(undefined);
                }}
                disabled={routes?.length == 0}
                variant={
                  table.getColumn("enabled")?.getFilterValue() == undefined
                    ? "tertiary"
                    : "secondary"
                }
              >
                All
              </ButtonGroup.Button>
            </ButtonGroup>
            <DataTableRowsPerPage
              table={table}
              disabled={routes?.length == 0}
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
