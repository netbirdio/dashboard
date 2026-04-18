import ButtonGroup from "@components/ButtonGroup";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import {
  ColumnDef,
  Row,
  RowSelectionState,
  SortingState,
  Table,
} from "@tanstack/react-table";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import PeerIcon from "@/assets/icons/PeerIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";
import PeerAddressCell from "@/modules/peers/PeerAddressCell";
import PeerLastSeenCell from "@/modules/peers/PeerLastSeenCell";
import PeerNameCell from "@/modules/peers/PeerNameCell";
import { PeerOSCell } from "@/modules/peers/PeerOSCell";

type Props = {
  peers?: Peer[];
  peerID?: string;
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  rightSide?: (table: Table<Peer>) => React.ReactNode;
  getStartedCard?: React.ReactNode;
  columns?: ColumnDef<Peer>[];
  selectedRows?: RowSelectionState;
  setSelectedRows?: (updater: React.SetStateAction<RowSelectionState>) => void;
  onRowClick?: (row: Row<Peer>) => void;
};

function useMinimalPeersTableColumns(): ColumnDef<Peer>[] {
  const { t } = useI18n();

  return [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.name")}</DataTableHeader>;
      },
      sortingFn: "text",
      cell: ({ row }) => <PeerNameCell peer={row.original} />,
    },
    {
      id: "connected",
      accessorKey: "connected",
      accessorFn: (peer) => peer.connected,
    },
    {
      accessorKey: "ip",
      sortingFn: "text",
    },
    {
      id: "user_name",
      accessorFn: (peer) => (peer.user ? peer.user?.name : t("peerDetails.unknown")),
    },
    {
      id: "user_email",
      accessorFn: (peer) => (peer.user ? peer.user?.email : t("peerDetails.unknown")),
    },
    {
      accessorKey: "dns_label",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("resourcesTable.address")}</DataTableHeader>;
      },
      cell: ({ row }) => <PeerAddressCell peer={row.original} />,
    },
    {
      accessorKey: "last_seen",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("peerDetails.lastSeen")}</DataTableHeader>;
      },
      sortingFn: "datetime",
      cell: ({ row }) => <PeerLastSeenCell peer={row.original} />,
    },
    {
      accessorKey: "os",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("peerDetails.operatingSystem")}</DataTableHeader>;
      },
      cell: ({ row }) => <PeerOSCell os={row.original.os} />,
    },
  ];
}

export default function MinimalPeersTable({
  peers,
  isLoading,
  headingTarget,
  peerID,
  rightSide,
  columns,
  selectedRows,
  setSelectedRows,
  onRowClick,
  getStartedCard,
}: Props) {
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const defaultColumns = useMinimalPeersTableColumns();

  // Default sorting state of the table
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "connected",
      desc: true,
    },
    {
      id: "last_seen",
      desc: true,
    },
    {
      id: "name",
      desc: false,
    },
  ]);

  return (
    <DataTable
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-6 w-full" }}
      headingTarget={headingTarget}
      useRowId={true}
      sorting={sorting}
      setSorting={setSorting}
      rowSelection={selectedRows}
      setRowSelection={setSelectedRows}
      onRowClick={onRowClick}
      minimal={true}
      showSearchAndFilters={true}
      inset={false}
      tableClassName={"mt-0"}
      text={t("peers.title")}
      columns={columns ?? defaultColumns}
      keepStateInLocalStorage={false}
      data={peers}
      searchPlaceholder={t("minimalPeers.searchPlaceholder")}
      isLoading={isLoading}
      getStartedCard={
        !getStartedCard ? (
          <NoResults
            className={"py-4"}
            title={t("minimalPeers.emptyTitle")}
            description={t("minimalPeers.emptyDescription")}
            icon={<PeerIcon size={20} className={"fill-nb-gray-300"} />}
          />
        ) : (
          getStartedCard
        )
      }
      rightSide={rightSide}
      columnVisibility={{
        select: permission?.groups?.update && permission?.peers?.update,
        connected: false,
        ip: false,
        user_name: false,
        user_email: false,
      }}
      paginationPaddingClassName={"px-0 pt-8"}
    >
      {(table) => (
        <>
          <ButtonGroup disabled={peers?.length == 0}>
            <ButtonGroup.Button
              disabled={peers?.length == 0}
              onClick={() => {
                table.setPageIndex(0);
                table.setColumnFilters([
                  {
                    id: "connected",
                    value: undefined,
                  },
                ]);
              }}
              variant={
                table.getColumn("connected")?.getFilterValue() == undefined
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("filters.all")}
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => {
                table.setPageIndex(0);
                table.setColumnFilters([
                  {
                    id: "connected",
                    value: true,
                  },
                ]);
              }}
              disabled={peers?.length == 0}
              variant={
                table.getColumn("connected")?.getFilterValue() == true
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("peerFilters.online")}
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => {
                table.setPageIndex(0);
                table.setColumnFilters([
                  {
                    id: "connected",
                    value: false,
                  },
                ]);
              }}
              disabled={peers?.length == 0}
              variant={
                table.getColumn("connected")?.getFilterValue() == false
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("peerFilters.offline")}
            </ButtonGroup.Button>
          </ButtonGroup>

          <DataTableRowsPerPage table={table} disabled={peers?.length == 0} />

          <DataTableRefreshButton
            isDisabled={peers?.length == 0}
            onClick={() => {
              mutate("/users").then();
              if (peerID) {
                mutate(`/peers/${peerID}/accessible-peers`).then();
                return;
              }
              mutate(`/peers`).then();
            }}
          />
        </>
      )}
    </DataTable>
  );
}
