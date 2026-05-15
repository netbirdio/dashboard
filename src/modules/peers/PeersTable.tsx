import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import FullTooltip from "@components/FullTooltip";
import { NoPeersGettingStarted } from "@components/NoPeersGettingStarted";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/Popover";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import AddPeerButton from "@components/ui/AddPeerButton";
import { NotificationCountBadge } from "@components/ui/NotificationCountBadge";
import {
  ColumnDef,
  RowSelectionState,
  SortingState,
  Table as TableType,
} from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandItem } from "cmdk";
import { trim, uniqBy } from "lodash";
import {
  Check,
  ChevronsUpDown,
  MonitorDotIcon,
  WifiIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import PeerProvider from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser, useUsers } from "@/contexts/UsersProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { User } from "@/interfaces/User";
import { GroupFilterSelector } from "@/modules/groups/GroupFilterSelector";
import { UserFilterSelector } from "@/modules/users/UserFilterSelector";
import PeerActionCell from "@/modules/peers/PeerActionCell";
import PeerAddressCell from "@/modules/peers/PeerAddressCell";
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
    id: "user_id_filter",
    accessorFn: (peer) => peer.user_id,
    filterFn: "arrIncludesSome",
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
    header: ({ column, table }) => {
      return (
        <DataTableHeader
          column={column}
          onSort={() => {
            const desc = column.getIsSorted() === "desc";
            table.setSorting([{ id: "last_seen", desc: !desc }]);
          }}
        >
          Last seen
        </DataTableHeader>
      );
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
  {
    id: "ipv6",
    accessorFn: (row) => row.ipv6,
  },
];

export type PeersTableKind = "users" | "servers";

type Props = {
  peers?: Peer[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  kind?: PeersTableKind;
};

// Peers split into two kinds:
//   users   – owner is a real (non-service) user, typically added via SSO
//   servers – no owner, or owner is a service user, typically enrolled via setup key
const matchesKind = (peer: Peer, kind?: PeersTableKind) => {
  if (!kind) return true;
  const hasRealUser = !!peer.user && !peer.user.is_service_user;
  return kind === "users" ? hasRealUser : !hasRealUser;
};

export default function PeersTable({
  peers,
  isLoading,
  headingTarget,
  kind,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "last_seen",
        desc: true,
      },
      {
        id: "name",
        desc: false,
      },
    ],
  );

  const kindFilteredPeers = useMemo(
    () => peers?.filter((p) => matchesKind(p, kind)),
    [peers, kind],
  );

  const pendingApprovalCount =
    kindFilteredPeers?.filter((p) => p.approval_required).length || 0;

  const tableGroups =
    (uniqBy(
      kindFilteredPeers?.map((p) => p.groups?.map((g) => g)).flatMap((g) => g),
      "name",
    ) as Group[]) || ([] as Group[]);

  const { isUser } = useLoggedInUser();
  const { users: accountUsers } = useUsers();

  // The user filter only offers users who actually own at least one peer
  // in the current view — keeps the list short and meaningful.
  const tableUsers = useMemo(() => {
    if (!accountUsers || !kindFilteredPeers) return [] as User[];
    const owning = new Set<string>();
    kindFilteredPeers.forEach((p) => {
      if (p.user_id) owning.add(p.user_id);
    });
    return accountUsers.filter((u) => owning.has(u.id));
  }, [accountUsers, kindFilteredPeers]);

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
        kindFilteredPeers?.filter((peer) =>
          condition ? isWebClient(peer) : !isWebClient(peer),
        ) ?? []
      );
    },
    [kindFilteredPeers],
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
        initialPageSize={25}
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
          user_id_filter: false,
          actions: permission.peers.update,
          groups: permission.groups.read,
          os: false,
          ipv6: false,
        }}
        isLoading={isLoading}
        getStartedCard={<NoPeersGettingStarted showBackground={true} />}
        rightSide={() => <>{peers && peers.length > 0 && <AddPeerButton />}</>}
      >
        {(table) => (
          <>
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

            <OnlineStatusFilter
              table={table}
              disabled={peers?.length == 0}
              resetSelectedRows={resetSelectedRows}
            />

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

            {!isUser && tableUsers.length > 0 && (
              <UserFilterSelector
                disabled={peers?.length == 0}
                values={
                  (table
                    .getColumn("user_id_filter")
                    ?.getFilterValue() as string[]) || []
                }
                onChange={(userIds) => {
                  table.setPageIndex(0);
                  if (userIds.length === 0) {
                    table
                      .getColumn("user_id_filter")
                      ?.setFilterValue(undefined);
                  } else {
                    table
                      .getColumn("user_id_filter")
                      ?.setFilterValue(userIds);
                  }
                  resetSelectedRows();
                }}
                users={tableUsers}
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

type StatusFilterOption = {
  value: "all" | "online" | "offline";
  label: string;
  filterValue: boolean | undefined;
  dotClass: string;
};

const STATUS_OPTIONS: StatusFilterOption[] = [
  {
    value: "all",
    label: "All",
    filterValue: undefined,
    dotClass: "bg-nb-gray-500",
  },
  {
    value: "online",
    label: "Online",
    filterValue: true,
    dotClass: "bg-green-500",
  },
  {
    value: "offline",
    label: "Offline",
    filterValue: false,
    dotClass: "bg-nb-gray-700",
  },
];

function OnlineStatusFilter({
  table,
  disabled,
  resetSelectedRows,
}: {
  table: TableType<Peer>;
  disabled: boolean;
  resetSelectedRows: () => void;
}) {
  const [open, setOpen] = useState(false);
  const filterValue = table.getColumn("connected")?.getFilterValue();
  const current =
    STATUS_OPTIONS.find((o) => o.filterValue === filterValue) ??
    STATUS_OPTIONS[0];

  const apply = (option: StatusFilterOption) => {
    table.setPageIndex(0);
    const groupFilters = table.getColumn("group_names")?.getFilterValue();
    table.setColumnFilters([
      { id: "connected", value: option.filterValue },
      { id: "approval_required", value: undefined },
      { id: "group_names", value: groupFilters ?? [] },
    ]);
    resetSelectedRows();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={"secondary"} disabled={disabled}>
          <WifiIcon size={16} className={"shrink-0"} />
          <div className={"w-full flex justify-between"}>
            {current.label}
            <div className={"pl-2"}>
              <ChevronsUpDown size={18} className={"shrink-0"} />
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={"w-[180px] p-0"} sideOffset={7}>
        <Command value={current.value}>
          <CommandGroup>
            {STATUS_OPTIONS.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => apply(option)}
              >
                <div
                  className={cn(
                    "cursor-pointer flex gap-2 px-2 py-1.5 my-1 mx-1 rounded-md items-center hover:dark:bg-nb-gray-800 text-nb-gray-400 hover:text-white w-full",
                    current.value === option.value ? "text-white" : "",
                  )}
                >
                  <Check
                    size={15}
                    className={cn(
                      "text-white shrink-0",
                      current.value === option.value
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      option.dotClass,
                    )}
                  />
                  {option.label}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
