import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { usePortalElement } from "@hooks/usePortalElement";
import { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { Route } from "@/interfaces/Route";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";
import PeerRouteNameCell from "@/modules/peer/PeerRouteNameCell";
import GroupedRouteNetworkRangeCell from "@/modules/route-group/GroupedRouteNetworkRangeCell";
import NetworkRoutesTable from "@/modules/route-group/NetworkRoutesTable";
import useGroupedRoutes from "@/modules/route-group/useGroupedRoutes";
import RouteActiveCell from "@/modules/routes/RouteActiveCell";
import RouteMetricCell from "@/modules/routes/RouteMetricCell";

export const GroupNetworkRoutesTableColumns: ColumnDef<Route>[] = [
  {
    accessorKey: "network_id",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <PeerRouteNameCell route={row.original} />,
  },
  {
    accessorKey: "description",
    sortingFn: "text",
  },
  {
    accessorKey: "domain_search",
    sortingFn: "text",
  },
  {
    accessorKey: "network",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Network</DataTableHeader>;
    },
    cell: ({ row }) => (
      <GroupedRouteNetworkRangeCell
        domains={row.original?.domains}
        network={row.original?.network}
      />
    ),
  },
  {
    accessorKey: "metric",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Metric</DataTableHeader>;
    },
    cell: ({ row }) => <RouteMetricCell metric={row.original.metric} />,
    sortingFn: "alphanumeric",
  },
  {
    id: "enabled",
    accessorKey: "enabled",
    sortingFn: "basic",
    header: ({ column }) => (
      <DataTableHeader column={column}>Active</DataTableHeader>
    ),
    cell: ({ row }) => <RouteActiveCell route={row.original} />,
  },
];

export const GroupNetworkRoutesSection = ({ routes }: { routes?: Route[] }) => {
  const groupedRoutes = useGroupedRoutes({ routes });

  return (
    <GroupDetailsTableContainer>
      <NetworkRoutesTable
        isGroupPage={true}
        isLoading={false}
        groupedRoutes={groupedRoutes}
        routes={routes}
      />
    </GroupDetailsTableContainer>
  );
};
