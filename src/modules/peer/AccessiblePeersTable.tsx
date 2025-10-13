import ButtonGroup from "@components/ButtonGroup";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import PeerIcon from "@/assets/icons/PeerIcon";
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
  inGroup?: boolean
  rightSide?: () => React.ReactNode
  removeFromGroupCell?: (peer: Peer) => React.ReactNode
};

const AccessiblePeersColumns: ColumnDef<Peer>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
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
      return <DataTableHeader column={column}>Address</DataTableHeader>;
    },
    cell: ({ row }) => <PeerAddressCell peer={row.original} />,
  },
  {
    accessorKey: "last_seen",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Last seen</DataTableHeader>;
    },
    sortingFn: "datetime",
    cell: ({ row }) => <PeerLastSeenCell peer={row.original} />,
  },
  {
    accessorKey: "os",
    header: ({ column }) => {
      return <DataTableHeader column={column}>OS</DataTableHeader>;
    },
    cell: ({ row }) => <PeerOSCell os={row.original.os} />,
  },
];

export default function AccessiblePeersTable({
  peers,
  isLoading,
  headingTarget,
  peerID,
  inGroup,
  rightSide,
  removeFromGroupCell,
}: Props) {
  const { mutate } = useSWRConfig();
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
      minimal={true}
      showSearchAndFilters={true}
      inset={false}
      tableClassName={"mt-0"}
      text={"Peers"}
      columns={inGroup && removeFromGroupCell ? [...AccessiblePeersColumns, {
        accessorKey: "id",
        header:"",
        cell: ({ row }) => removeFromGroupCell(row.original),
      },] : AccessiblePeersColumns}
      keepStateInLocalStorage={false}
      data={peers}
      searchPlaceholder={"Search by name, IP, owner or group..."}
      isLoading={isLoading}
      getStartedCard={
        <NoResults
          className={"py-4"}
          title={inGroup ? "No peers assigned to this group" : "This peer has no accessible peers"}
          description={!inGroup ?
            "Add more peers to your network or check your access control policies." : ""
          }
          icon={<PeerIcon size={20} className={"fill-nb-gray-300"} />}
        />
      }
      rightSide={rightSide}
      columnVisibility={{
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
              All
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
              Online
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
              Offline
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
