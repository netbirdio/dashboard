import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import FullTooltip from "@components/FullTooltip";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableMultiSelectPopup } from "@components/table/DataTableMultiSelectPopup";
import { InstallNetBirdButton } from "@components/ui/InstallNetBirdButton";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { MinusCircle, PlusCircle } from "lucide-react";
import * as React from "react";
import { lazy, useState } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { useGroupContext } from "@/contexts/GroupProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Peer } from "@/interfaces/Peer";
import { AssignPeerToGroupModal } from "@/modules/groups/AssignPeerToGroupModal";
import { GroupPeersRemoveCell } from "@/modules/groups/details/GroupDetailsRemoveCell";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";
import PeerAddressCell from "@/modules/peers/PeerAddressCell";
import PeerLastSeenCell from "@/modules/peers/PeerLastSeenCell";
import PeerNameCell from "@/modules/peers/PeerNameCell";
import { PeerOSCell } from "@/modules/peers/PeerOSCell";

const GroupPeersTable = lazy(() => import("@/modules/peer/MinimalPeersTable"));

const GroupPeersTableColumns: ColumnDef<Peer>[] = [
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
  {
    id: "remove_from_group",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <GroupPeersRemoveCell peer={row.original} />,
  },
];

type Props = {
  peers?: Peer[];
  isLoading?: boolean;
};

export const GroupPeersSection = ({ peers, isLoading = true }: Props) => {
  const { group, addPeersToGroup, removePeersFromGroup } = useGroupContext();
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
  const [open, setOpen] = useState(false);
  const { permission } = usePermissions();

  return (
    <GroupDetailsTableContainer>
      <GroupPeersTable
        isLoading={isLoading}
        peers={peers}
        columns={GroupPeersTableColumns}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"This group has no assigned peers yet"}
            description={
              "Install NetBird and assign existing peers to this group to see them listed here."
            }
            icon={<PeerIcon size={20} className={"fill-nb-gray-300"} />}
          >
            {permission?.peers?.update && permission?.groups?.update && (
              <div className={"flex items-center justify-center mt-4 gap-4"}>
                <InstallNetBirdButton />
                <Button
                  variant={"primary"}
                  size={"sm"}
                  onClick={() => setOpen(true)}
                >
                  <PlusCircle size={16} />
                  Assign Peers
                </Button>
              </div>
            )}
          </NoResults>
        }
        onRowClick={(row) => row.toggleSelected()}
        rightSide={(table) => (
          <>
            <DataTableMultiSelectPopup
              selectedItems={table
                .getSelectedRowModel()
                .rows.map((row) => row.original)}
              onCanceled={() => setSelectedRows({})}
              rightSide={
                <>
                  <FullTooltip
                    content={
                      <span className={"text-xs"}>Remove Peers from Group</span>
                    }
                  >
                    <Button
                      variant={"default-outline"}
                      size={"xs"}
                      className={"!h-9 !w-9"}
                      onClick={() => {
                        let peers = table
                          .getSelectedRowModel()
                          .rows.map((row) => row.original);
                        removePeersFromGroup(peers).then();
                        setSelectedRows({});
                      }}
                    >
                      <MinusCircle size={16} className={"shrink-0"} />
                    </Button>
                  </FullTooltip>
                </>
              }
            />
            <AssignPeerToGroupModal
              group={group}
              open={open}
              setOpen={setOpen}
              useSave={false}
              showHeader={false}
              showClose={false}
              buttonText={"Assign Peers"}
              selectInitialPeers={false}
              excludedPeers={peers}
              onUpdate={(g) => {
                let peers = g.peers as Peer[];
                addPeersToGroup(peers).then();
              }}
            />
            {peers && peers?.length > 0 && (
              <div className={"ml-auto flex items-center"}>
                <div className={"flex items-center justify-center gap-4"}>
                  <InstallNetBirdButton />
                  {permission?.peers?.update && permission?.groups?.update && (
                    <Button
                      variant={"primary"}
                      size={"sm"}
                      onClick={() => setOpen(true)}
                    >
                      <PlusCircle size={16} />
                      Assign Peers
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      />
    </GroupDetailsTableContainer>
  );
};
