import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import AddPeerButton from "@components/ui/AddPeerButton";
import GetStartedTest from "@components/ui/GetStartedTest";
import { NotificationCountBadge } from "@components/ui/NotificationCountBadge";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { uniqBy } from "lodash";
import { ExternalLinkIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import PeerIcon from "@/assets/icons/PeerIcon";
import PeerProvider from "@/contexts/PeerProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { GroupSelector } from "@/modules/groups/GroupSelector";
import PeerActionCell from "@/modules/peers/PeerActionCell";
import PeerAddressCell from "@/modules/peers/PeerAddressCell";
import PeerGroupCell from "@/modules/peers/PeerGroupCell";
import PeerLastSeenCell from "@/modules/peers/PeerLastSeenCell";
import PeerNameCell from "@/modules/peers/PeerNameCell";
import { PeerOSCell } from "@/modules/peers/PeerOSCell";
import PeerStatusCell from "@/modules/peers/PeerStatusCell";
import PeerVersionCell from "@/modules/peers/PeerVersionCell";

const PeersTableColumns: ColumnDef<Peer>[] = [
  {
    accessorKey: "name",
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
    accessorKey: "ip6",
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
    accessorKey: "os",
    header: ({ column }) => {
      return <DataTableHeader column={column}>OS</DataTableHeader>;
    },
    cell: ({ row }) => <PeerOSCell os={row.original.os} />,
  },
  {
    accessorKey: "version",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Version</DataTableHeader>;
    },
    cell: ({ row }) => <PeerVersionCell version={row.original.version} />,
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
};
export default function PeersTable({ peers, isLoading }: Props) {
  const { mutate } = useSWRConfig();
  const router = useRouter();
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

  return (
    <DataTable
      onRowClick={(row) => router.push("/peer?id=" + row.original.id)}
      text={"Peers"}
      sorting={sorting}
      setSorting={setSorting}
      columns={PeersTableColumns}
      data={peers}
      searchPlaceholder={"Search by name, IP, owner or group..."}
      columnVisibility={{
        connected: false,
        approval_required: false,
        group_name_strings: false,
        group_names: false,
        ip: false,
        ip6: false,
        user_name: false,
        user_email: false,
        actions: !isUser,
      }}
      isLoading={isLoading}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<PeerIcon className={"fill-nb-gray-200"} size={20} />}
              color={"gray"}
              size={"large"}
            />
          }
          title={"Get Started with NetBird"}
          description={
            "It looks like you don't have any connected machines.\n" +
            "Get started by adding one to your network."
          }
          button={<AddPeerButton />}
          learnMore={
            <>
              Learn more in our{" "}
              <InlineLink
                href={"https://docs.netbird.io/how-to/getting-started"}
                target={"_blank"}
              >
                Getting Started Guide
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      rightSide={() => <>{peers && peers.length > 0 && <AddPeerButton />}</>}
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
                  {
                    id: "approval_required",
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
                  {
                    id: "approval_required",
                    value: undefined,
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
                  {
                    id: "approval_required",
                    value: undefined,
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
              }}
              variant={
                table.getColumn("approval_required")?.getFilterValue() === true
                  ? "tertiary"
                  : "secondary"
              }
            >
              Pending Approvals
              <NotificationCountBadge count={pendingApprovalCount} />
            </Button>
          )}
          <DataTableRowsPerPage table={table} disabled={peers?.length == 0} />

          <GroupSelector
            disabled={peers?.length == 0}
            values={
              (table.getColumn("group_names")?.getFilterValue() as string[]) ||
              []
            }
            onChange={(groups) => {
              table.setPageIndex(0);
              if (groups.length == 0) {
                table.getColumn("group_names")?.setFilterValue(undefined);
                return;
              } else {
                table.getColumn("group_names")?.setFilterValue(groups);
              }
            }}
            groups={tableGroups}
          />

          <DataTableRefreshButton
            isDisabled={peers?.length == 0}
            onClick={() => {
              mutate("/groups").then();
              mutate("/users").then();
              mutate("/peers").then();
            }}
          />
        </>
      )}
    </DataTable>
  );
}
