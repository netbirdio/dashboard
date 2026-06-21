import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import { Checkbox } from "@components/Checkbox";
import FullTooltip from "@components/FullTooltip";
import { NoPeersGettingStarted } from "@components/NoPeersGettingStarted";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  CheckboxListPicker,
  CheckboxOption,
  formatCheckboxChip,
} from "@components/table/filters/CheckboxListPicker";
import {
  formatGroupsChip,
  GroupsPicker,
} from "@components/table/filters/GroupsPicker";
import {
  formatStatusChip,
  StatusPicker,
} from "@components/table/filters/StatusPicker";
import {
  formatUsersChip,
  UserOption,
  UsersPicker,
} from "@components/table/filters/UsersPicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import AddPeerButton from "@components/ui/AddPeerButton";
import NoResults from "@components/ui/NoResults";
import { NotificationCountBadge } from "@components/ui/NotificationCountBadge";
import {
  ColumnDef,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import { trim, uniqBy } from "lodash";
import {
  MonitorDotIcon,
  MonitorSmartphoneIcon,
  ServerIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import PeerIcon from "@/assets/icons/PeerIcon";
import PeerProvider from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getOperatingSystem } from "@/hooks/useOperatingSystem";
import { Group } from "@/interfaces/Group";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";
import PeerActionCell from "@/modules/peers/PeerActionCell";
import PeerAddressCell from "@/modules/peers/PeerAddressCell";
import PeerGroupCell from "@/modules/peers/PeerGroupCell";
import PeerLastSeenCell from "@/modules/peers/PeerLastSeenCell";
import { PeerMultiSelect } from "@/modules/peers/PeerMultiSelect";
import PeerNameCell from "@/modules/peers/PeerNameCell";
import { PeerOSCell } from "@/modules/peers/PeerOSCell";
import PeerStatusCell from "@/modules/peers/PeerStatusCell";
import PeerVersionCell from "@/modules/peers/PeerVersionCell";
import {
  matchesPeerTableKind,
  PEERS_TABLE_KIND_LABELS,
  PeersTableKind,
} from "@/modules/peers/peerKind";
import { cn, removeAllSpaces } from "@utils/helpers";

// Stable key per OS family for the filter column. Mirrors the icon
// selection in PeerOSCell so the chip label and the displayed OS icon
// always agree.
function peerOsKey(os: string | undefined): string {
  const kind = getOperatingSystem(os || "");
  switch (kind) {
    case OperatingSystem.WINDOWS:
      return "windows";
    case OperatingSystem.APPLE:
      return "mac";
    case OperatingSystem.ANDROID:
      return "android";
    case OperatingSystem.IOS:
      return "ios";
    default:
      return "linux";
  }
}

const getPeersTableColumns = (
  showPeerKindIcons: boolean,
): ColumnDef<Peer>[] => [
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
    cell: ({ row }) => (
      <PeerNameCell peer={row.original} showPeerKindIcon={showPeerKindIcons} />
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
    filterFn: "equalsString",
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
    id: "os_kind",
    accessorFn: (peer) => peerOsKey(peer.os),
    filterFn: "arrIncludesSome",
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

const DEFAULT_ENABLED_KINDS: Record<PeersTableKind, boolean> = {
  users: true,
  servers: true,
};

type Props = {
  peers?: Peer[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  kind?: PeersTableKind;
  showKindFilters?: boolean;
};

export default function PeersTable({
  peers,
  isLoading,
  headingTarget,
  kind,
  showKindFilters = false,
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
  const [enabledKinds, setEnabledKinds] = useLocalStorage<
    Record<PeersTableKind, boolean>
  >(
    "netbird-peer-kind-filters",
    DEFAULT_ENABLED_KINDS,
    showKindFilters && !kind,
  );
  const currentEnabledKinds = useMemo(
    () => ({ ...DEFAULT_ENABLED_KINDS, ...enabledKinds }),
    [enabledKinds],
  );

  const kindFilteredPeers = useMemo(
    () =>
      peers?.filter((peer) => {
        if (kind) return matchesPeerTableKind(peer, kind);
        if (!showKindFilters) return true;

        const peerKind = matchesPeerTableKind(peer, "users")
          ? "users"
          : "servers";
        return currentEnabledKinds[peerKind];
      }),
    [peers, kind, showKindFilters, currentEnabledKinds],
  );

  const pendingApprovalCount =
    kindFilteredPeers?.filter((p) => p.approval_required).length || 0;

  const tableGroups =
    (uniqBy(
      kindFilteredPeers?.map((p) => p.groups?.map((g) => g)).flatMap((g) => g),
      "name",
    ) as Group[]) || ([] as Group[]);

  // Users derived from the current kind-filtered set, so the Users
  // filter offers only owners that actually appear in the table.
  const tableUsers = useMemo<UserOption[]>(() => {
    if (!kindFilteredPeers) return [];
    const map = new Map<string, UserOption>();
    kindFilteredPeers.forEach((p) => {
      if (!p.user || !p.user.email) return;
      map.set(p.user.id, {
        id: p.user.id,
        name: p.user.name || p.user.email,
        email: p.user.email,
      });
    });
    return Array.from(map.values());
  }, [kindFilteredPeers]);

  const selectedKindCount =
    Object.values(currentEnabledKinds).filter(Boolean).length;
  const headingCountLabel =
    showKindFilters && !kind
      ? currentEnabledKinds.servers && !currentEnabledKinds.users
        ? "Server "
        : currentEnabledKinds.users && !currentEnabledKinds.servers
        ? "Device "
        : ""
      : "";
  const showPeerKindIcons =
    showKindFilters &&
    !kind &&
    currentEnabledKinds.servers &&
    currentEnabledKinds.users;
  const peersTableColumns = useMemo(
    () => getPeersTableColumns(showPeerKindIcons),
    [showPeerKindIcons],
  );
  const hasPeerKindFilterResult =
    showKindFilters &&
    !kind &&
    !!peers &&
    peers.length > 0 &&
    (kindFilteredPeers?.length ?? 0) === 0;

  const { isUser } = useLoggedInUser();

  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});

  const resetSelectedRows = () => {
    if (Object.keys(selectedRows).length > 0) {
      setSelectedRows({});
    }
  };

  const toggleKind = (peerKind: PeersTableKind) => {
    setEnabledKinds((current) => {
      const normalized = { ...DEFAULT_ENABLED_KINDS, ...current };
      return {
        ...normalized,
        [peerKind]: !normalized[peerKind],
      };
    });
    resetSelectedRows();
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

  // Operating system options. Same set as the OS icons rendered in
  // PeerOSCell — we don't expose FreeBSD / Docker as separate filter
  // entries since they fold into Linux for the chosen icon.
  const osOptions = useMemo<CheckboxOption<string>[]>(
    () => [
      { value: "linux", label: "Linux" },
      { value: "windows", label: "Windows" },
      { value: "mac", label: "macOS" },
      { value: "android", label: "Android" },
      { value: "ios", label: "iOS" },
    ],
    [],
  );

  // Filter definitions powering the consolidated `Filters` button +
  // chip row. The Users filter is only meaningful for the User Devices
  // view; servers (no real owner) skip it.
  const filterDefs = useMemo<TableFilterDef[]>(() => {
    const defs: TableFilterDef[] = [
      {
        id: "connected",
        label: "Status",
        renderPicker: (p) => (
          <StatusPicker
            value={p.value as boolean | undefined}
            onChange={p.onChange}
            close={p.close}
          />
        ),
        formatChip: (v) => formatStatusChip(v as boolean | undefined),
      },
      {
        id: "os_kind",
        label: "OS",
        renderPicker: (p) => (
          <CheckboxListPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            options={osOptions}
          />
        ),
        formatChip: (v) =>
          formatCheckboxChip(v as string[] | undefined, osOptions, "platforms"),
      },
    ];
    if (!isUser) {
      defs.push({
        id: "group_names",
        label: "Groups",
        renderPicker: (p) => (
          <GroupsPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            groups={tableGroups}
          />
        ),
        formatChip: (v) => formatGroupsChip(v as string[] | undefined),
      });
    }
    if (
      (kind === "users" || showKindFilters) &&
      !isUser &&
      tableUsers.length > 0
    ) {
      defs.push({
        id: "user_email",
        label: "Users",
        renderPicker: (p) => (
          <UsersPicker
            value={p.value as string | undefined}
            onChange={p.onChange}
            close={p.close}
            options={tableUsers}
          />
        ),
        formatChip: (v) => formatUsersChip(v as string | undefined, tableUsers),
      });
    }
    return defs;
  }, [isUser, kind, osOptions, showKindFilters, tableGroups, tableUsers]);

  return (
    <>
      <PeerMultiSelect
        selectedPeers={selectedRows}
        onCanceled={() => setSelectedRows({})}
      />
      <DataTable
        headingTarget={headingTarget}
        headingCountLabel={headingCountLabel}
        rowSelection={selectedRows}
        setRowSelection={setSelectedRows}
        useRowId={true}
        text={"Peers"}
        sorting={sorting}
        setSorting={setSorting}
        initialPageSize={25}
        showResetFilterButton={false}
        columns={peersTableColumns}
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
          groups: permission.groups.read,
          os: false,
          os_kind: false,
          ipv6: false,
        }}
        isLoading={isLoading}
        getStartedCard={
          hasPeerKindFilterResult ? (
            <NoResults
              className={"py-4"}
              title={
                selectedKindCount === 0
                  ? "No peer types selected"
                  : "No peers match this view"
              }
              description={
                selectedKindCount === 0
                  ? "Turn on Devices or Servers to show peers."
                  : "Try another peer type."
              }
              icon={<PeerIcon size={20} className={"fill-nb-gray-300"} />}
            />
          ) : (
            <NoPeersGettingStarted
              showBackground={true}
              isUserDevice={kind ? kind === "users" : undefined}
            />
          )
        }
        rightSide={() => (
          <>
            {peers && peers.length > 0 && (
              <AddPeerButton
                isUserDevice={kind ? kind === "users" : undefined}
              />
            )}
          </>
        )}
        aboveTable={(table) => (
          <TableFilterChips table={table} filters={filterDefs} />
        )}
      >
        {(table) => (
          <>
            {showKindFilters && !kind && (
              <ButtonGroup disabled={peers?.length == 0}>
                {(["servers", "users"] as PeersTableKind[]).map((peerKind) => (
                  <ButtonGroup.Button
                    key={peerKind}
                    aria-pressed={currentEnabledKinds[peerKind]}
                    className={cn(
                      currentEnabledKinds[peerKind]
                        ? "!bg-gray-100 !text-gray-900 dark:!bg-nb-gray-900/70 dark:!text-nb-gray-100 dark:!border-nb-gray-800 dark:hover:!bg-nb-gray-900"
                        : "dark:!bg-nb-gray-920 dark:!text-nb-gray-500 dark:hover:!text-nb-gray-200",
                    )}
                    disabled={peers?.length == 0}
                    onClick={() => {
                      table.setPageIndex(0);
                      toggleKind(peerKind);
                    }}
                    variant={"secondary"}
                  >
                    {peerKind === "servers" ? (
                      <ServerIcon
                        size={15}
                        strokeWidth={1.8}
                        className={"shrink-0"}
                        aria-hidden={true}
                      />
                    ) : (
                      <MonitorSmartphoneIcon
                        size={15}
                        strokeWidth={1.8}
                        className={"shrink-0"}
                        aria-hidden={true}
                      />
                    )}
                    {PEERS_TABLE_KIND_LABELS[peerKind]}
                  </ButtonGroup.Button>
                ))}
              </ButtonGroup>
            )}

            <TableFiltersButton
              table={table}
              filters={filterDefs}
              disabled={peers?.length == 0}
            />

            <DataTableResetFilterButton
              table={table}
              onClick={() => {
                table.setPageIndex(0);
                table.resetColumnFilters();
                table.resetGlobalFilter();
                setEnabledKinds(DEFAULT_ENABLED_KINDS);
                resetSelectedRows();
              }}
            />

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
