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
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";
import { AssignPeerToGroupModal } from "@/modules/groups/AssignPeerToGroupModal";
import { GroupPeersRemoveCell } from "@/modules/groups/details/GroupDetailsRemoveCell";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";
import PeerAddressCell from "@/modules/peers/PeerAddressCell";
import PeerLastSeenCell from "@/modules/peers/PeerLastSeenCell";
import PeerNameCell from "@/modules/peers/PeerNameCell";
import { PeerOSCell } from "@/modules/peers/PeerOSCell";

const GroupPeersTable = lazy(() => import("@/modules/peer/MinimalPeersTable"));

function useGroupPeersTableColumns(): ColumnDef<Peer>[] {
  const { t } = useI18n();

  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className={"min-w-[20px] max-w-[20px]"}>
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            aria-label={t("groupUsers.selectAll")}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className={"min-w-[20px] max-w-[20px]"}>
          <Checkbox
            checked={row.getIsSelected()}
            variant={"tableCell"}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t("groupUsers.selectRow")}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
    {
      id: "remove_from_group",
      accessorKey: "id",
      header: "",
      cell: ({ row }) => <GroupPeersRemoveCell peer={row.original} />,
    },
  ];
}

type Props = {
  peers?: Peer[];
  isLoading?: boolean;
};

export const GroupPeersSection = ({ peers, isLoading = true }: Props) => {
  const { t } = useI18n();
  const { group, addPeersToGroup, removePeersFromGroup } = useGroupContext();
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
  const [open, setOpen] = useState(false);
  const { permission } = usePermissions();
  const columns = useGroupPeersTableColumns();

  return (
    <GroupDetailsTableContainer>
      <GroupPeersTable
        isLoading={isLoading}
        peers={peers}
        columns={columns}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={t("groupPeers.emptyTitle")}
            description={t("groupPeers.emptyDescription")}
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
                  {t("groupPeers.assignPeers")}
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
                      <span className={"text-xs"}>{t("groupPeers.removeFromGroup")}</span>
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
              buttonText={t("groupPeers.assignPeers")}
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
                      {t("groupPeers.assignPeers")}
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
