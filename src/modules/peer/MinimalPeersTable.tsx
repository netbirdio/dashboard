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
import { useTranslations } from "next-intl";
import * as React from "react";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import PeerIcon from "@/assets/icons/PeerIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
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

function useMinimalPeersTableColumns(
  t: ReturnType<typeof useTranslations>,
): ColumnDef<Peer>[] {
  return useMemo<ColumnDef<Peer>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("name")}</DataTableHeader>;
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
        accessorFn: (peer) => (peer.user ? peer.user?.name : "Unknown"),
      },
      {
        id: "user_email",
        accessorFn: (peer) => (peer.user ? peer.user?.email : "Unknown"),
      },
      {
        accessorKey: "dns_label",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("address")}</DataTableHeader>;
        },
        cell: ({ row }) => <PeerAddressCell peer={row.original} />,
      },
      {
        accessorKey: "last_seen",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("lastSeen")}</DataTableHeader>;
        },
        sortingFn: "datetime",
        cell: ({ row }) => <PeerLastSeenCell peer={row.original} />,
      },
      {
        accessorKey: "os",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("os")}</DataTableHeader>;
        },
        cell: ({ row }) => <PeerOSCell os={row.original.os} />,
      },
    ],
    [t],
  );
}

export default function MinimalPeersTable({
  peers,
  isLoading,
  headingTarget,
  peerID,
  rightSide,
  columns: columnsProp,
  selectedRows,
  setSelectedRows,
  onRowClick,
  getStartedCard,
}: Props) {
  const t = useTranslations("peers");
  const tCommon = useTranslations("common");
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const localizedColumns = useMinimalPeersTableColumns(t);
  const columns = columnsProp ?? localizedColumns;

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
      text={t("title")}
      columns={columns}
      keepStateInLocalStorage={false}
      data={peers}
      searchPlaceholder={t("searchByNameIpOwnerOrGroup")}
      isLoading={isLoading}
      getStartedCard={
        !getStartedCard ? (
          <NoResults
            className={"py-4"}
            title={t("noAccessiblePeersTitle")}
            description={t("noAccessiblePeersDescription")}
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
              {tCommon("all")}
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
              {tCommon("online")}
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
              {tCommon("offline")}
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
