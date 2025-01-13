import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import * as React from "react";
import { useState } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { NetworkRouter } from "@/interfaces/Network";
import { NetworkRoutingPeerName } from "@/modules/networks/routing-peers/NetworkRoutingPeerName";
import { RoutingPeersActionCell } from "@/modules/networks/routing-peers/RoutingPeersActionCell";
import { RoutingPeersEnabledCell } from "@/modules/networks/routing-peers/RoutingPeersEnabledCell";
import { RoutingPeersMasqueradeCell } from "@/modules/networks/routing-peers/RoutingPeersMasqueradeCell";
import RouteMetricCell from "@/modules/routes/RouteMetricCell";

type Props = {
  routers?: NetworkRouter[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

const NetworkRouterColumns: ColumnDef<NetworkRouter>[] = [
  {
    id: "name",
    accessorKey: "id",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Peer</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <NetworkRoutingPeerName router={row.original} />,
  },
  {
    id: "enabled",
    accessorKey: "enabled",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Active</DataTableHeader>;
    },
    cell: ({ row }) => <RoutingPeersEnabledCell router={row.original} />,
  },
  {
    id: "metric",
    accessorKey: "metric",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Metric</DataTableHeader>;
    },
    cell: ({ row }) => (
      <RouteMetricCell metric={row.original.metric} useHoverStyle={false} />
    ),
  },
  {
    id: "masquerade",
    accessorKey: "masquerade",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Masquerade</DataTableHeader>;
    },
    cell: ({ row }) => <RoutingPeersMasqueradeCell router={row.original} />,
  },
  {
    id: "actions",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => {
      return <RoutingPeersActionCell router={row.original} />;
    },
  },
];

export default function NetworkRoutingPeersTable({
  routers,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "metric",
      desc: false,
    },
  ]);

  return (
    <DataTable
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-6 w-full" }}
      headingTarget={headingTarget}
      sorting={sorting}
      setSorting={setSorting}
      minimal={true}
      showSearchAndFilters={false}
      inset={false}
      tableClassName={"mt-0"}
      text={"Peers"}
      columns={NetworkRouterColumns}
      keepStateInLocalStorage={false}
      data={routers}
      searchPlaceholder={"Search by name, IP, owner or group..."}
      isLoading={isLoading}
      getStartedCard={
        <NoResults
          className={"py-4"}
          title={"This network has no routing peers"}
          description={
            "Add routing peers to this network to access resources inside this network."
          }
          icon={<PeerIcon size={20} className={"fill-nb-gray-300"} />}
        />
      }
      columnVisibility={{}}
      paginationPaddingClassName={"px-0 pt-8"}
    />
  );
}
