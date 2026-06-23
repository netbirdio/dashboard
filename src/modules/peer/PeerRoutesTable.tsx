import { useTranslations } from "next-intl";
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
  peer: Peer;
};

function RouteTableColumns(
  t: ReturnType<typeof useTranslations>,
): ColumnDef<Route>[] {
  return [
    {
      accessorKey: "network_id",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("name")}</DataTableHeader>;
      },
      sortingFn: "text",
      cell: ({ row }) => <PeerRouteNameCell route={row.original} />,
    },
    {
      accessorKey: "network",
      header: ({ column }) => {
        return (
          <DataTableHeader column={column}>{t("network")}</DataTableHeader>
        );
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
          <DataTableHeader column={column}>
            {t("distributionGroups")}
          </DataTableHeader>
        );
      },
      cell: ({ row }) => <RouteDistributionGroupsCell route={row.original} />,
    },
    {
      id: "enabled",
      accessorKey: "enabled",
      sortingFn: "basic",
      header: ({ column }) => (
        <DataTableHeader column={column}>{t("active")}</DataTableHeader>
      ),
      cell: ({ row }) => <PeerRouteActiveCell route={row.original} />,
    },
    {
      accessorKey: "id",
      header: "",
      cell: ({ row }) => <PeerRouteActionCell route={row.original} />,
    },
  ];
}

export default function PeerRoutesTable({
  peerRoutes,
  isLoading,
  peer,
}: Props) {
  const t = useTranslations("common");
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
        text={t("networkRoutes")}
        tableClassName={"mt-0"}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={t("noNetworkRoutes")}
            description={t("noNetworkRoutesDesc")}
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
        columns={RouteTableColumns(t)}
        data={peerRoutes}
        paginationPaddingClassName={"px-0 pt-8"}
      />
    </>
  );
}
