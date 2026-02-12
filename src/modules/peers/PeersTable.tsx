import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import { Checkbox } from "@components/Checkbox";
import FullTooltip from "@components/FullTooltip";
import { NoPeersGettingStarted } from "@components/NoPeersGettingStarted";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import AddPeerButton from "@components/ui/AddPeerButton";
import { NotificationCountBadge } from "@components/ui/NotificationCountBadge";
import {
  ColumnDef,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import { trim, uniqBy } from "lodash";
import { MonitorDotIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import PeerProvider from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { GroupFilterSelector } from "@/modules/groups/GroupFilterSelector";
import PeerActionCell from "@/modules/peers/PeerActionCell";
import PeerAddressCell from "@/modules/peers/PeerAddressCell";
import { PeerConnectButton } from "@/modules/peers/PeerConnectButton";
import PeerGroupCell from "@/modules/peers/PeerGroupCell";
import PeerLastSeenCell from "@/modules/peers/PeerLastSeenCell";
import { PeerMultiSelect } from "@/modules/peers/PeerMultiSelect";
import PeerNameCell from "@/modules/peers/PeerNameCell";
import { PeerOSCell } from "@/modules/peers/PeerOSCell";
import PeerStatusCell from "@/modules/peers/PeerStatusCell";
import PeerVersionCell from "@/modules/peers/PeerVersionCell";
import { removeAllSpaces } from "@utils/helpers";

const PeersTableColumns: ColumnDef<Peer>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={row.getIsSelected()}
          variant={"tableCell"}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "name",
    accessorFn: (peer) => `${peer?.name}${peer?.dns_label}`,
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <PeerNameCell peer={row.original} />,
  },
  {
    id: "connect",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => (
      <PeerProvider peer={row.original}>
        <PeerConnectButton />
      </PeerProvider>
    ),
  },
  {
    id: "approval_required",
    accessorKey: "approval_required",
    sortingFn: "basic",
    accessorFn: (peer) => peer.approval_required,
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
    id: "dns_label",
    accessorKey: "dns_label",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Address</DataTableHeader>;
    },
    cell: ({ row }) => <PeerAddressCell peer={row.original} />,
  },
  {
    accessorKey: "group_name_strings",
    accessorFn: (peer) => peer.groups?.map((g) => g?.name || "").join(", "),
    sortingFn: "text",
  },
  {
    accessorKey: "group_names",
    accessorFn: (peer) => peer.groups?.map((g) => g?.name || ""),
    sortingFn: "text",
    filterFn: "arrIncludesSome",
  },
  {
    accessorFn: (peer) => peer.groups?.length,
    id: "groups",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Groups</DataTableHeader>;
    },
    cell: ({ row }) => (
      <PeerProvider peer={row.original}>
        <PeerGroupCell />
      </PeerProvider>
    ),
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
    id: "os",
    accessorFn: (peer) => removeAllSpaces(peer?.os),
    header: ({ column }) => {
      return <DataTableHeader column={column}>OS</DataTableHeader>;
    },
    cell: ({ row }) => (
      <PeerOSCell os={row.original.os} serial={row.original.serial_number} />
    ),
  },
  {
    id: "serial",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Serial number</DataTableHeader>;
    },
    accessorFn: (peer) => peer.serial_number,
    sortingFn: "text",
  },
  {
    accessorKey: "version",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Version</DataTableHeader>;
    },
    cell: ({ row }) => (
      <PeerVersionCell
        version={row.original.version}
        os={row.original.os}
        serial={row.original.serial_number}
        ephemeral={row.original.ephemeral}
      />
    ),
  },
  {
    id: "status",
    accessorFn: (peer) => {
      let statusCount = 0;
      if (peer.login_expired) statusCount++;
      if (peer.approval_required) statusCount++;
      return statusCount;
    },
    header: () => {
      return "";
    },
    sortingFn: "text",
    cell: ({ row }) => (
      <PeerProvider peer={row.original}>
        <PeerStatusCell peer={row.original} />
      </PeerProvider>
    ),
  },
  {
    id: "actions",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => (
      <PeerProvider peer={row.original}>
        <PeerActionCell />
      </PeerProvider>
    ),
  },
];

type Props = {
  peers?: Peer[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function PeersTable({
  peers,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "connected",
        desc: true,
      },
      {
        id: "name",
        desc: false,
      },
      {
        id: "last_seen",
        desc: true,
      },
    ],
  );

  const pendingApprovalCount =
    peers?.filter((p) => p.approval_required).length || 0;

  const tableGroups =
    (uniqBy(
      peers?.map((p) => p.groups?.map((g) => g)).flatMap((g) => g),
      "name",
    ) as Group[]) || ([] as Group[]);

  const { isUser } = useLoggedInUser();

  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});

  const resetSelectedRows = () => {
    if (Object.keys(selectedRows).length > 0) {
      setSelectedRows({});
    }
  };

  const [showBrowserPeers, setShowBrowserPeers] = useState(false);

  const withBrowserPeers = useCallback(
    (condition: boolean) => {
      const isWebClient = (peer: Peer) => {
        return trim(peer?.os) == "js" || peer.kernel_version === "wasm";
      };

      return (
        peers?.filter((peer) =>
          condition ? isWebClient(peer) : !isWebClient(peer),
        ) ?? []
      );
    },
    [peers],
  );

  const browserPeers = useMemo(() => {
    return withBrowserPeers(true);
  }, [withBrowserPeers]);

  const regularPeers = useMemo(() => {
    return withBrowserPeers(false);
  }, [withBrowserPeers]);

  useEffect(() => {
    if (showBrowserPeers && browserPeers?.length === 0) {
      setShowBrowserPeers(false);
    }
  }, [showBrowserPeers, browserPeers]);

  return (
    <>
      <PeerMultiSelect
        selectedPeers={selectedRows}
        onCanceled={() => setSelectedRows({})}
      />
      <DataTable
        headingTarget={headingTarget}
        rowSelection={selectedRows}
        setRowSelection={setSelectedRows}
        useRowId={true}
        text={"Peers"}
        sorting={sorting}
        setSorting={setSorting}
        columns={PeersTableColumns}
        data={showBrowserPeers ? browserPeers : regularPeers}
        searchPlaceholder={"Search by name, IP, owner or group..."}
        columnVisibility={{
          select: permission.groups.read,
          connected: false,
          approval_required: false,
          group_name_strings: false,
          group_names: false,
          ip: false,
          serial: false,
          user_name: false,
          user_email: false,
          actions: permission.peers.update,
          connect: permission.peers.update,
          groups: permission.groups.read,
          os: false,
        }}
        isLoading={isLoading}
        getStartedCard={<NoPeersGettingStarted showBackground={true} />}
        rightSide={() => <>{peers && peers.length > 0 && <AddPeerButton />}</>}
      >
        {(table) => (
          <>
            <ButtonGroup disabled={peers?.length == 0}>
              <ButtonGroup.Button
                disabled={peers?.length == 0}
                onClick={() => {
                  table.setPageIndex(0);
                  let groupFilters = table
                    .getColumn("group_names")
                    ?.getFilterValue();
                  table.setColumnFilters([
                    {
                      id: "connected",
                      value: undefined,
                    },
                    {
                      id: "approval_required",
                      value: undefined,
                    },
                    {
                      id: "group_names",
                      value: groupFilters ?? [],
                    },
                    {
                      id: "group_names",
                      value: groupFilters ?? [],
                    },
                  ]);
                  resetSelectedRows();
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
                  let groupFilters = table
                    .getColumn("group_names")
                    ?.getFilterValue();
                  table.setColumnFilters([
                    {
                      id: "connected",
                      value: true,
                    },
                    {
                      id: "approval_required",
                      value: undefined,
                    },
                    {
                      id: "group_names",
                      value: groupFilters ?? [],
                    },
                    {
                      id: "group_names",
                      value: groupFilters ?? [],
                    },
                  ]);
                  resetSelectedRows();
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
                  let groupFilters = table
                    .getColumn("group_names")
                    ?.getFilterValue();
                  table.setColumnFilters([
                    {
                      id: "connected",
                      value: false,
                    },
                    {
                      id: "approval_required",
                      value: undefined,
                    },
                    {
                      id: "group_names",
                      value: groupFilters ?? [],
                    },
                  ]);
                  resetSelectedRows();
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

            {pendingApprovalCount > 0 && (
              <Button
                disabled={peers?.length == 0}
                onClick={() => {
                  table.setPageIndex(0);
                  let current =
                    table.getColumn("approval_required")?.getFilterValue() ===
                    undefined
                      ? true
                      : undefined;

                  table.setColumnFilters([
                    {
                      id: "connected",
                      value: undefined,
                    },
                    {
                      id: "approval_required",
                      value: current,
                    },
                  ]);

                  resetSelectedRows();
                }}
                variant={
                  table.getColumn("approval_required")?.getFilterValue() ===
                  true
                    ? "tertiary"
                    : "secondary"
                }
              >
                Pending Approvals
                <NotificationCountBadge count={pendingApprovalCount} />
              </Button>
            )}

            <DataTableRowsPerPage table={table} disabled={peers?.length == 0} />

            {!isUser && (
              <GroupFilterSelector
                disabled={peers?.length == 0}
                values={
                  (table
                    .getColumn("group_names")
                    ?.getFilterValue() as string[]) || []
                }
                onChange={(groups) => {
                  table.setPageIndex(0);
                  if (groups.length == 0) {
                    table.getColumn("group_names")?.setFilterValue(undefined);
                    return;
                  } else {
                    table.getColumn("group_names")?.setFilterValue(groups);
                  }
                  resetSelectedRows();
                }}
                groups={tableGroups}
              />
            )}

            {browserPeers?.length > 0 && (
              <FullTooltip
                content={
                  <div className={"max-w-sm text-xs"}>
                    Show temporary peers created by the NetBird browser client.
                    These peers are ephemeral and will be deleted automatically
                    after a short period of time.
                  </div>
                }
              >
                <Button
                  className={"h-[44px]"}
                  variant={showBrowserPeers ? "tertiary" : "secondary"}
                  onClick={() => {
                    setShowBrowserPeers(!showBrowserPeers);
                  }}
                >
                  <MonitorDotIcon size={16} />
                </Button>
              </FullTooltip>
            )}

            <DataTableRefreshButton
              isDisabled={peers?.length == 0}
              onClick={() => {
                if (!isUser) mutate("/groups").then();
                mutate("/users").then();
                mutate("/peers").then();
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
