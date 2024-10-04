import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import React, { useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { Peer } from "@/interfaces/Peer";
import { Route } from "@/interfaces/Route";
import PeerRouteActionCell from "@/modules/peer/PeerRouteActionCell";
import PeerRouteActiveCell from "@/modules/peer/PeerRouteActiveCell";
import PeerRouteNameCell from "@/modules/peer/PeerRouteNameCell";
import GroupedRouteNetworkRangeCell from "@/modules/route-group/GroupedRouteNetworkRangeCell";
import RouteDistributionGroupsCell from "@/modules/routes/RouteDistributionGroupsCell";

type Props = {
  peerRoutes?: Route[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  peer: Peer;
};

export const RouteTableColumns: ColumnDef<Route>[] = [
  {
    accessorKey: "network_id",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <PeerRouteNameCell route={row.original} />,
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
    id: "groups",
    accessorFn: (r) => r.groups?.length,
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>Distribution Groups</DataTableHeader>
      );
    },
    cell: ({ row }) => <RouteDistributionGroupsCell route={row.original} />,
  },
  {
    id: "enabled",
    accessorKey: "enabled",
    sortingFn: "basic",
    header: ({ column }) => (
      <DataTableHeader column={column}>Active</DataTableHeader>
    ),
    cell: ({ row }) => <PeerRouteActiveCell route={row.original} />,
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <PeerRouteActionCell route={row.original} />,
  },
];

export default function PeerRoutesTable({
  peerRoutes,
  isLoading,
  peer,
}: Props) {
  // Default sorting state of the table
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "network_id",
      desc: true,
    },
  ]);

  return (
    <>
      <DataTable
        wrapperComponent={Card}
        wrapperProps={{
          className: cn("w-full"),
        }}
        text={"Network Routes"}
        tableClassName={"mt-0"}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"This peer has no network routes"}
            description={
              "You don't have any assigned network routes yet. You can add this peer to an existing network or create a new network route."
            }
            icon={
              <NetworkRoutesIcon size={20} className={"fill-nb-gray-300"} />
            }
          />
        }
        minimal={true}
        showSearchAndFilters={false}
        inset={false}
        isLoading={isLoading}
        sorting={sorting}
        setSorting={setSorting}
        columns={RouteTableColumns}
        data={peerRoutes}
        paginationPaddingClassName={"px-0 pt-8"}
      />
    </>
  );
}
