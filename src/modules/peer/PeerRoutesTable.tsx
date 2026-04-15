import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import React, { useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { useI18n } from "@/i18n/I18nProvider";
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

function usePeerRouteTableColumns(): ColumnDef<Route>[] {
  const { t } = useI18n();

  return [
    {
      accessorKey: "network_id",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.name")}</DataTableHeader>;
      },
      sortingFn: "text",
      cell: ({ row }) => <PeerRouteNameCell route={row.original} />,
    },
    {
      accessorKey: "network",
      header: ({ column }) => {
        return (
          <DataTableHeader column={column}>{t("networkDetails.network")}</DataTableHeader>
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
            {t("routeModal.distributionGroups")}
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
        <DataTableHeader column={column}>{t("table.active")}</DataTableHeader>
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
}: Props) {
  const { t } = useI18n();
  const columns = usePeerRouteTableColumns();
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
        text={t("networkRoutesPage.title")}
        tableClassName={"mt-0"}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={t("peerRoutes.emptyTitle")}
            description={t("peerRoutes.emptyDescription")}
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
        columns={columns}
        data={peerRoutes}
        paginationPaddingClassName={"px-0 pt-8"}
      />
    </>
  );
}
