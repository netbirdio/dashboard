import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import { Modal, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResultsCard from "@components/ui/NoResultsCard";
import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import useFetchApi, { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { FolderGit2, PencilLineIcon } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import PeerIcon from "@/assets/icons/PeerIcon";
import { DataTable } from "@/components/table/DataTable";
import { Group, GroupPeer } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { EditGroupNameModal } from "@/modules/groups/EditGroupNameModal";
import PeerAddressCell from "@/modules/peers/PeerAddressCell";
import PeerNameCell from "@/modules/peers/PeerNameCell";
import { PeerOSCell } from "@/modules/peers/PeerOSCell";

type Props = {
  group: Group;
  open: boolean;
  setOpen: (open: boolean) => void;
  onUpdate?: (g: Group) => void;
  useSave?: boolean;
  excludedPeers?: Peer[];
  showHeader?: boolean;
  showClose?: boolean;
  buttonText?: string;
  selectInitialPeers?: boolean;
};

export const AssignPeerToGroupModal = ({
  group,
  open = false,
  setOpen,
  onUpdate,
  useSave = true,
  excludedPeers,
  showHeader,
  showClose,
  buttonText,
  selectInitialPeers,
}: Props) => {
  return (
    <Modal open={open} onOpenChange={setOpen} key={open ? "1" : "0"}>
      {open && (
        <AssignGroupToPeerModalContent
          group={group}
          onSuccess={(g) => {
            setOpen(false);
            onUpdate && onUpdate(g);
          }}
          useSave={useSave}
          excludedPeers={excludedPeers}
          showHeader={showHeader}
          showClose={showClose}
          buttonText={buttonText}
          selectInitialPeers={selectInitialPeers}
        />
      )}
    </Modal>
  );
};

type ContentProps = {
  group: Group;
  onSuccess?: (g: Group) => void;
  useSave?: boolean;
  excludedPeers?: Peer[];
  showHeader?: boolean;
  showClose?: boolean;
  buttonText?: string;
  selectInitialPeers?: boolean;
};

export const AssignGroupToPeerModalContent = ({
  group,
  onSuccess,
  useSave,
  excludedPeers,
  showHeader = true,
  showClose = true,
  buttonText = "Confirm Changes",
  selectInitialPeers = true,
}: ContentProps) => {
  const { data: peers, isLoading } = useFetchApi<Peer[]>("/peers");
  const { mutate } = useSWRConfig();
  const groupRequest = useApiCall<Group>("/groups");
  const [initialPeersSet, setInitialPeersSet] = useState(false);
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
  const isAllGroup = group.name === "All";
  const [sorting, setSorting] = useState([
    {
      id: "select",
      desc: false,
    },
    {
      id: "name",
      desc: false,
    },
  ]);

  const [groupNameModal, setGroupNameModal] = useState(false);
  const [groupName, setGroupName] = useState(group.name);

  const onGroupNameUpdate = (name: string) => {
    setGroupNameModal(false);
    setGroupName(name);
  };

  // Get initially selected peers
  const getInitialSelectedPeers = useCallback(() => {
    if (!selectInitialPeers) return {};
    if (!group) return undefined;
    if (!peers) return undefined;
    let initialSelectedPeers = group?.peers
      ?.map((p) => {
        if (typeof p === "string") return p;
        return p.id;
      })
      .filter((p) => p !== undefined) as string[];
    if (!initialSelectedPeers) return {};

    // Return Record<string, boolean> for initialSelectedPeers
    return initialSelectedPeers.reduce(
      (acc, peerId) => {
        acc[peerId] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }, [group, peers, selectInitialPeers]);

  const handleOnSave = async (selectedPeers: Peer[]) => {
    if (!useSave) {
      onSuccess?.({
        ...group,
        name: groupName,
        peers: selectedPeers.map((peer) => {
          return {
            id: peer.id,
            name: peer.name,
          } as GroupPeer;
        }),
        peers_count: selectedPeers.length,
        resources: group.resources,
        keepClientState: true,
      });
      return;
    }

    const hasGroupID = !!group?.id;
    let request;

    if (hasGroupID) {
      request = () =>
        groupRequest.put(
          {
            name: group.name,
            peers: selectedPeers.map((peer) => peer.id),
            resources: group.resources,
          },
          "/" + group?.id,
        );
    } else {
      request = () =>
        groupRequest.post({
          name: group.name,
          peers: selectedPeers.map((peer) => peer.id),
          resources: group.resources,
        });
    }
    notify({
      title: "Saving changes",
      description: `${group?.name || "Group"} was successfully saved.`,
      promise: request()
        .then((g: Group) => {
          mutate("/groups");
          onSuccess && onSuccess(g);
        })
        .catch(() => {}),
      loadingMessage: "Updating group...",
    });
  };

  useEffect(() => {
    if (initialPeersSet) return;
    const initialSelectedPeers = getInitialSelectedPeers();
    if (initialSelectedPeers === undefined) return;
    setSelectedRows(initialSelectedPeers);
    setInitialPeersSet(true);
  }, [getInitialSelectedPeers, initialPeersSet]);

  const data = useMemo(() => {
    if (!initialPeersSet) return;
    return peers?.filter((p) => {
      if (!excludedPeers || excludedPeers.length === 0) return true;
      return !excludedPeers.find((ep) => ep.id === p.id);
    });
  }, [initialPeersSet, peers, excludedPeers]);

  return (
    <ModalContent
      maxWidthClass={"max-w-4xl"}
      className={cn(peers && peers.length > 0 ? "pb-0" : "pb-8")}
      showClose={showClose}
    >
      {groupNameModal && (
        <EditGroupNameModal
          initialName={groupName}
          open={groupNameModal}
          onOpenChange={setGroupNameModal}
          onSuccess={onGroupNameUpdate}
        />
      )}

      {showHeader && (
        <div className={"flex items-start justify-between pr-8"}>
          <ModalHeader
            title={
              <div className={"flex items-center gap-2 mb-1 text-nb-gray-100"}>
                <FolderGit2 size={16} className={"shrink-0"} />
                <div className={"flex gap-2 items-center"}>
                  {groupName}
                  {groupName !== "All" && (
                    <button
                      className={
                        "flex items-center gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 py-2 px-3 rounded-md cursor-pointer"
                      }
                      onClick={() => setGroupNameModal(true)}
                    >
                      <PencilLineIcon size={16} />
                    </button>
                  )}
                </div>
              </div>
            }
            description={
              isAllGroup
                ? "View assigned peers for this group"
                : "Manage assigned peers for this group"
            }
            color={"blue"}
          />
        </div>
      )}

      {initialPeersSet ? (
        <DataTable
          useRowId={true}
          rowSelection={selectedRows}
          setRowSelection={setSelectedRows}
          onRowClick={(row) => row.toggleSelected()}
          text={"Peers"}
          resetRowSelectionOnSearch={false}
          uniqueKey={group?.id ?? group?.name}
          sorting={sorting}
          keepStateInLocalStorage={false}
          setSorting={setSorting}
          columns={PeersTableColumns}
          data={data}
          isLoading={isLoading && !initialPeersSet}
          tableCellClassName={"!py-1 scale-[95%]"}
          searchPlaceholder={"Search by name, IP or owner..."}
          searchClassName={"w-[350px]"}
          minimal={false}
          columnVisibility={{
            connected: false,
            select: !isAllGroup,
            approval_required: false,
            group_name_strings: false,
            group_names: false,
            ip: false,
            user_name: false,
            user_email: false,
          }}
          getStartedCard={
            <NoResultsCard
              className={"mb-8"}
              title={"You don't have any peers to assign"}
              description={
                "In order to assign peers to this group you need to have at least one peer that is not already part of this group."
              }
              icon={<PeerIcon className={"fill-nb-gray-200"} size={14} />}
            />
          }
          rightSide={(table) => (
            <div className={"ml-auto flex items-center gap-5"}>
              <div className={"text-sm"}>
                {Object.keys(selectedRows).length > 0 && (
                  <div className={"text-nb-gray-200"}>
                    <span className={"text-netbird font-medium"}>
                      {Object.keys(selectedRows).length}
                    </span>{" "}
                    Peer(s) selected
                  </div>
                )}
              </div>
              {!isAllGroup && (
                <Button
                  variant={"primary"}
                  className={"ml-auto"}
                  disabled={
                    peers?.length === 0 ||
                    Object.keys(selectedRows).length === 0
                  }
                  onClick={() => {
                    const selectedPeers = table
                      .getSelectedRowModel()
                      .rows.map((row) => row.original);
                    handleOnSave(selectedPeers).then();
                  }}
                >
                  {buttonText}
                </Button>
              )}
            </div>
          )}
        />
      ) : (
        <SkeletonTable withHeader={false} />
      )}
    </ModalContent>
  );
};

export const PeersTableColumns: ColumnDef<Peer>[] = [
  {
    id: "select",
    header: ({ table, column }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    accessorFn: (peer) => peer.id,
    sortingFn: "checkbox",
    cell: ({ row }) => {
      return (
        <div className={"min-w-[20px] max-w-[20px]"}>
          <Checkbox
            variant={"tableCell"}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <PeerNameCell peer={row.original} linkToPeer={false} />,
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
    accessorKey: "os",
    header: ({ column }) => {
      return <DataTableHeader column={column}>OS</DataTableHeader>;
    },
    cell: ({ row }) => (
      <PeerOSCell os={row.original.os} serial={row.original.serial_number} />
    ),
  },
];
