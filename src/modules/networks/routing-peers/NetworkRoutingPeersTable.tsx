import Button from "@components/Button";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { IconCirclePlus } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import * as React from "react";
import { useState } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { NetworkRouter } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
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

function useNetworkRouterColumns(): ColumnDef<NetworkRouter>[] {
  const { t } = useI18n();

  return [
    {
      id: "name",
      accessorKey: "id",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("networkRouting.peer")}</DataTableHeader>;
      },
      sortingFn: "text",
      cell: ({ row }) => <NetworkRoutingPeerName router={row.original} />,
    },
    {
      id: "enabled",
      accessorKey: "enabled",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.active")}</DataTableHeader>;
      },
      cell: ({ row }) => <RoutingPeersEnabledCell router={row.original} />,
    },
    {
      id: "metric",
      accessorKey: "metric",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("networkRouting.metric")}</DataTableHeader>;
      },
      cell: ({ row }) => (
        <RouteMetricCell metric={row.original.metric} useHoverStyle={false} />
      ),
    },
    {
      id: "masquerade",
      accessorKey: "masquerade",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("networkRouting.masquerade")}</DataTableHeader>;
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
    {
      id: "search",
      accessorKey: "search",
      header: "",
      filterFn: "fuzzy",
    },
  ];
}

export default function NetworkRoutingPeersTable({
  routers,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { t } = useI18n();
  const { permission } = usePermissions();
  const { openAddRoutingPeerModal, network } = useNetworksContext();
  const columns = useNetworkRouterColumns();

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "metric",
      desc: false,
    },
  ]);

  return (
    <DataTable
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-6 pb-2 w-full" }}
      headingTarget={headingTarget}
      sorting={sorting}
      setSorting={setSorting}
      minimal={true}
      showSearchAndFilters={true}
      inset={false}
      tableClassName={"mt-0"}
      text={t("networkDetails.routingPeers")}
      columns={columns}
      keepStateInLocalStorage={false}
      data={routers}
      searchPlaceholder={t("networkRouting.searchPlaceholder")}
      isLoading={isLoading}
      getStartedCard={
        <NoResults
          className={"py-4"}
          title={t("networkRouting.emptyTitle")}
          description={t("networkRouting.emptyDescription")}
          icon={<PeerIcon size={18} className={"fill-nb-gray-400"} />}
        />
      }
      columnVisibility={{ search: false }}
      paginationPaddingClassName={"px-0 pt-8"}
      rightSide={() => (
        <Button
          variant={"primary"}
          className={"ml-auto"}
          onClick={() => network && openAddRoutingPeerModal(network)}
          disabled={!permission.networks.update}
        >
          <IconCirclePlus size={16} />
          {t("networkRouting.add")}
        </Button>
      )}
    >
      {(table) => (
        <DataTableRowsPerPage
          table={table}
          disabled={!routers || routers?.length == 0}
        />
      )}
    </DataTable>
  );
}
